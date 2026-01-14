import { logger, env } from "../../shared/utils"

const __base_url = "https://api.luarmor.net/v3"
const __log      = logger.create_logger("luarmor")

// - CACHE CONFIGURATION - \\
let __users_cache: luarmor_user[] | null              = null
let __users_cache_timestamp                           = 0
const __users_cache_duration                          = 15 * 60 * 1000
const __users_cache_stale_while_revalidate            = 60 * 60 * 1000

let __user_cache: Map<string, luarmor_user>           = new Map()
let __user_cache_timestamp: Map<string, number>       = new Map()
const __user_cache_duration                           = 15 * 60 * 1000

// - REQUEST DEDUPLICATION - \\
const __pending_requests: Map<string, Promise<any>>   = new Map()

// - RATE LIMIT TRACKING - \\
const __rate_limit_cooldowns: Map<string, number>     = new Map()
const __rate_limit_cooldown_duration                  = 60 * 1000

// - CIRCUIT BREAKER - \\
let __circuit_breaker_failures                        = 0
let __circuit_breaker_last_failure                    = 0
const __circuit_breaker_threshold                     = 5
const __circuit_breaker_timeout                       = 30 * 1000

// - PERFORMANCE OPTIMIZATION - \\
const __default_timeout                               = 5000
const __fast_timeout                                  = 3000

// - HTTP ERROR CLASSIFICATION - \\
enum error_type {
  client_error    = "CLIENT_ERROR",
  server_error    = "SERVER_ERROR",
  network_error   = "NETWORK_ERROR",
  timeout_error   = "TIMEOUT_ERROR",
  rate_limit      = "RATE_LIMIT",
  parse_error     = "PARSE_ERROR",
  validation      = "VALIDATION",
}

interface api_error {
  type    : error_type
  status? : number
  message : string
  retry   : boolean
}

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_project_id(): string {
  return env.required("LUARMOR_PROJECT_ID")
}

/**
 * - VALIDATE INPUT PARAMETERS - \\
 * @param discord_id Discord ID to validate
 * @returns true if valid
 */
function validate_discord_id(discord_id: string): boolean {
  if (!discord_id || typeof discord_id !== "string") return false
  if (discord_id.length < 17 || discord_id.length > 20) return false
  return /^\d+$/.test(discord_id)
}

/**
 * - VALIDATE USER KEY - \\
 * @param user_key User key to validate
 * @returns true if valid
 */
function validate_user_key(user_key: string): boolean {
  if (!user_key || typeof user_key !== "string") return false
  return user_key.length > 0 && user_key.length < 256
}

/**
 * - CHECK CIRCUIT BREAKER STATE - \\
 * @returns true if circuit is open (blocked)
 */
function is_circuit_open(): boolean {
  if (__circuit_breaker_failures < __circuit_breaker_threshold) {
    return false
  }
  
  const elapsed = Date.now() - __circuit_breaker_last_failure
  if (elapsed > __circuit_breaker_timeout) {
    __circuit_breaker_failures = 0
    return false
  }
  
  return true
}

/**
 * - RECORD CIRCUIT BREAKER FAILURE - \\
 */
function record_failure(): void {
  __circuit_breaker_failures++
  __circuit_breaker_last_failure = Date.now()
}

/**
 * - RESET CIRCUIT BREAKER - \\
 */
function reset_circuit(): void {
  __circuit_breaker_failures = 0
}

/**
 * - CHECK RATE LIMIT COOLDOWN - \\
 * @param key Rate limit key (endpoint or user)
 * @returns true if in cooldown
 */
function is_rate_limited(key: string): boolean {
  const cooldown_until = __rate_limit_cooldowns.get(key)
  if (!cooldown_until) return false
  
  if (Date.now() < cooldown_until) {
    return true
  }
  
  __rate_limit_cooldowns.delete(key)
  return false
}

/**
 * - SET RATE LIMIT COOLDOWN - \\
 * @param key Rate limit key
 * @param duration Cooldown duration in ms
 */
function set_rate_limit_cooldown(key: string, duration: number = __rate_limit_cooldown_duration): void {
  __rate_limit_cooldowns.set(key, Date.now() + duration)
}

/**
 * - CLASSIFY HTTP ERROR - \\
 * @param error Error object
 * @param status HTTP status code
 * @param response_data Response data if available
 * @returns Classified error
 */
function classify_error(error: any, status?: number, response_data?: any): api_error {
  // - TIMEOUT ERROR - \\
  if (error.name === "AbortError" || error.message?.includes("abort")) {
    return {
      type    : error_type.timeout_error,
      message : "Request timeout",
      retry   : true,
    }
  }
  
  // - NETWORK ERROR - \\
  if (error.message?.includes("fetch") || error.message?.includes("ECONNREFUSED")) {
    return {
      type    : error_type.network_error,
      message : "Network connection failed",
      retry   : true,
    }
  }
  
  // - HTTP STATUS BASED CLASSIFICATION - \\
  if (status) {
    // - CLIENT ERRORS (4xx) - \\
    if (status >= 400 && status < 500) {
      if (status === 429) {
        return {
          type    : error_type.rate_limit,
          status  : status,
          message : response_data?.message || "Rate limit exceeded",
          retry   : false,
        }
      }
      
      if (status === 401 || status === 403) {
        return {
          type    : error_type.client_error,
          status  : status,
          message : "Authentication failed",
          retry   : false,
        }
      }
      
      if (status === 400) {
        return {
          type    : error_type.validation,
          status  : status,
          message : response_data?.message || "Invalid request parameters",
          retry   : false,
        }
      }
      
      return {
        type    : error_type.client_error,
        status  : status,
        message : response_data?.message || "Client error",
        retry   : false,
      }
    }
    
    // - SERVER ERRORS (5xx) - \\
    if (status >= 500) {
      return {
        type    : error_type.server_error,
        status  : status,
        message : "Server error",
        retry   : true,
      }
    }
  }
  
  // - DEFAULT: NETWORK ERROR - \\
  return {
    type    : error_type.network_error,
    message : error.message || "Unknown error",
    retry   : true,
  }
}

/**
 * - SAFE JSON PARSE - \\
 * @param response Fetch response
 * @returns Parsed JSON or null
 */
async function safe_json_parse(response: Response): Promise<any> {
  try {
    const text = await response.text()
    if (!text || text.trim() === "") {
      __log.warn("Empty response body")
      return null
    }
    
    return JSON.parse(text)
  } catch (error) {
    __log.error("JSON parse failed:", error)
    return null
  }
}

/**
 * - CENTRAL HTTP REQUEST HANDLER - \\
 * @param url Request URL
 * @param options Request options
 * @returns Response data
 */
async function make_request<T>(
  url: string, 
  options: {
    method   : "GET" | "POST" | "PATCH" | "DELETE"
    body?    : any
    timeout? : number
  }
): Promise<{ success: boolean; data?: T; error?: api_error }> {
  
  // - CHECK CIRCUIT BREAKER - \\
  if (is_circuit_open()) {
    __log.warn("Circuit breaker open, rejecting request")
    return {
      success : false,
      error   : {
        type    : error_type.server_error,
        message : "Service temporarily unavailable",
        retry   : false,
      },
    }
  }
  
  // - SETUP REQUEST - \\
  const controller = new AbortController()
  const timeout    = options.timeout || __default_timeout
  const timeout_id = setTimeout(() => controller.abort(), timeout)
  
  const headers: Record<string, string> = {
    "Authorization"    : get_api_key(),
    "Accept-Encoding"  : "gzip, deflate, br",
    "Connection"       : "keep-alive",
    "Content-Type"     : "application/json",
  }
  
  const init: RequestInit = {
    method  : options.method,
    headers : headers,
    signal  : controller.signal,
  }
  
  if (options.body) {
    init.body = JSON.stringify(options.body)
  }
  
  try {
    __log.debug(`${options.method} ${url}`)
    
    const response = await fetch(url, init)
    const status   = response.status
    
    // - LOG HTTP STATUS - \\
    __log.debug(`Response: ${status} ${response.statusText}`)
    
    // - PARSE JSON SAFELY - \\
    const data = await safe_json_parse(response)
    
    // - CHECK HTTP STATUS - \\
    if (!response.ok) {
      const error = classify_error(new Error(`HTTP ${status}`), status, data)
      
      // - LOG ERROR WITH DETAILS - \\
      __log.error(`Request failed: ${error.type} - ${error.message}`, {
        url    : url,
        status : status,
        data   : data,
      })
      
      // - HANDLE RATE LIMIT - \\
      if (error.type === error_type.rate_limit) {
        const endpoint_key = `${options.method}:${url.split("?")[0]}`
        set_rate_limit_cooldown(endpoint_key, 60000)
        __log.warn(`Rate limit set for: ${endpoint_key}`)
      }
      
      // - RECORD FAILURE FOR CIRCUIT BREAKER - \\
      if (status >= 500) {
        record_failure()
      }
      
      return { success: false, error }
    }
    
    // - SUCCESS: RESET CIRCUIT BREAKER - \\
    reset_circuit()
    
    // - LOG SUCCESS - \\
    if (data) {
      __log.debug("Request successful", { data })
    }
    
    return { success: true, data: data as T }
    
  } catch (error: any) {
    const classified = classify_error(error)
    
    __log.error(`Request exception: ${classified.type} - ${classified.message}`, {
      url   : url,
      error : error.message,
    })
    
    if (classified.type === error_type.server_error) {
      record_failure()
    }
    
    return { success: false, error: classified }
    
  } finally {
    clearTimeout(timeout_id)
  }
}

/**
 * - DEDUPLICATE CONCURRENT REQUESTS - \\
 * @param key Request identifier
 * @param fn Request function to execute
 * @returns Promise with request result
 */
async function deduplicate_request<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = __pending_requests.get(key)
  if (existing) {
    __log.debug(`Deduplicating request: ${key}`)
    return existing as Promise<T>
  }
  
  const promise = fn().finally(() => {
    __pending_requests.delete(key)
  })
  
  __pending_requests.set(key, promise)
  return promise
}

export interface luarmor_user {
  user_key         : string
  identifier       : string | null
  identifier_type  : string
  discord_id       : string | null
  note             : string | null
  status           : string
  last_reset       : number
  total_resets     : number
  auth_expire      : number
  banned           : number
  ban_reason       : string
  ban_expire       : number
  unban_token      : string
  total_executions : number
  allowed_hwids    : string[]
  current_hwid     : string | null
  created_at       : string
  last_execution   : string | null
}

export interface luarmor_response<T> {
  success   : boolean
  data?     : T
  error?    : string
  message?  : string
  is_error? : boolean
}

export interface luarmor_stats {
  total_users       : number
  total_executions  : number
  users_today       : number
  executions_today  : number
  users_this_week   : number
  executions_week   : number
  users_this_month  : number
  executions_month  : number
}

export interface create_key_options {
  discord_id?  : string
  identifier?  : string
  note?        : string
  auth_expire? : number
}

/**
 * - CREATE NEW USER KEY - \\
 * @param options Creation options
 * @returns Response with user data
 */
export async function create_key(options: create_key_options = {}): Promise<luarmor_response<luarmor_user>> {
  // - VALIDATE INPUT - \\
  if (options.discord_id && !validate_discord_id(options.discord_id)) {
    return { success: false, error: "Invalid Discord ID format" }
  }
  
  const url = `${__base_url}/projects/${get_project_id()}/users`
  
  const body: Record<string, any> = {}
  if (options.discord_id)  body.discord_id  = options.discord_id
  if (options.identifier)  body.identifier  = options.identifier
  if (options.note)        body.note        = options.note
  if (options.auth_expire) body.auth_expire = options.auth_expire
  
  const result = await make_request<any>(url, {
    method  : "POST",
    body    : body,
    timeout : __fast_timeout,
  })
  
  if (!result.success) {
    return { success: false, error: result.error?.message || "Request failed" }
  }
  
  if (result.data?.user_key) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.data?.message || "Failed to create key" }
}

/**
 * - CREATE KEY FOR SPECIFIC PROJECT - \\
 * @param project_id Project ID
 * @param options Creation options
 * @returns Response with user data
 */
export async function create_key_for_project(
  project_id: string, 
  options: create_key_options = {}
): Promise<luarmor_response<luarmor_user>> {
  
  if (options.discord_id && !validate_discord_id(options.discord_id)) {
    return { success: false, error: "Invalid Discord ID format" }
  }
  
  const url = `${__base_url}/projects/${project_id}/users`
  
  const body: Record<string, any> = {}
  if (options.discord_id)  body.discord_id  = options.discord_id
  if (options.identifier)  body.identifier  = options.identifier
  if (options.note)        body.note        = options.note
  if (options.auth_expire) body.auth_expire = options.auth_expire
  
  const result = await make_request<any>(url, {
    method  : "POST",
    body    : body,
    timeout : __fast_timeout,
  })
  
  if (!result.success) {
    return { success: false, error: result.error?.message || "Request failed" }
  }
  
  if (result.data?.user_key) {
    return { success: true, data: result.data }
  }
  
  return { success: false, error: result.data?.message || "Failed to create key" }
}

/**
 * - DELETE USER FROM PROJECT - \\
 * @param project_id Project ID
 * @param discord_id Discord ID
 * @returns true if deleted successfully
 */
export async function delete_user_from_project(project_id: string, discord_id: string): Promise<boolean> {
  if (!validate_discord_id(discord_id)) {
    __log.error("Invalid Discord ID for deletion:", discord_id)
    return false
  }
  
  // - CHECK RATE LIMIT - \\
  const rate_key = `delete:${project_id}:${discord_id}`
  if (is_rate_limited(rate_key)) {
    __log.warn("Rate limited for deletion:", discord_id)
    return false
  }
  
  // - GET USER KEYS - \\
  const check_url = `${__base_url}/projects/${project_id}/users?discord_id=${discord_id}`
  const check_res = await make_request<any>(check_url, {
    method  : "GET",
    timeout : __fast_timeout,
  })
  
  if (!check_res.success) {
    __log.error("Failed to fetch user for deletion:", check_res.error?.message)
    return false
  }
  
  const user_keys: string[] = []
  const data = check_res.data
  
  if (data?.users && Array.isArray(data.users)) {
    for (const user of data.users) {
      if (user.user_key) user_keys.push(user.user_key)
    }
  } else if (Array.isArray(data) && data.length > 0) {
    for (const user of data) {
      if (user.user_key) user_keys.push(user.user_key)
    }
  } else if (data?.user_key) {
    user_keys.push(data.user_key)
  }
  
  if (user_keys.length === 0) {
    __log.info("No users found for deletion:", discord_id)
    return true
  }
  
  // - PARALLEL DELETE WITH LIMIT - \\
  const delete_promises = user_keys.map(async (key) => {
    const delete_url = `${__base_url}/projects/${project_id}/users?user_key=${key}`
    
    const result = await make_request<any>(delete_url, {
      method  : "DELETE",
      timeout : __fast_timeout,
    })
    
    return result.success || result.data?.success === true || result.data?.message?.toLowerCase().includes("deleted")
  })
  
  const results = await Promise.all(delete_promises)
  const failed  = results.filter(r => !r).length
  
  if (failed > 0) {
    __log.warn(`Failed to delete ${failed}/${user_keys.length} keys for ${discord_id}`)
  }
  
  return failed === 0
}

/**
 * - GET USER BY DISCORD ID - \\
 * @param discord_id Discord ID
 * @param project_id Optional project ID
 * @returns Response with user data
 */
export async function get_user_by_discord(
  discord_id: string, 
  project_id?: string
): Promise<luarmor_response<luarmor_user>> {
  
  if (!validate_discord_id(discord_id)) {
    return { success: false, error: "Invalid Discord ID format" }
  }
  
  const cache_key = `discord:${discord_id}:${project_id || "default"}`
  
  return deduplicate_request(cache_key, async () => {
    const now         = Date.now()
    const cached_user = __user_cache.get(discord_id)
    const cached_time = __user_cache_timestamp.get(discord_id) || 0
    const cache_age   = now - cached_time
    
    // - RETURN FRESH CACHE - \\
    if (cached_user && cache_age < __user_cache_duration && !project_id) {
      __log.debug("Cache hit (fresh):", discord_id)
      return { success: true, data: cached_user }
    }
    
    // - CHECK RATE LIMIT - \\
    const rate_key = `get_user:${discord_id}`
    if (is_rate_limited(rate_key)) {
      if (cached_user) {
        __log.warn("Rate limited, returning cached data:", discord_id)
        return { success: true, data: cached_user }
      }
      return { success: false, error: "Rate limit active, please try again later", is_error: true }
    }
    
    const pid = project_id || get_project_id()
    const url = `${__base_url}/projects/${pid}/users?discord_id=${discord_id}`
    
    const result = await make_request<any>(url, {
      method  : "GET",
      timeout : __fast_timeout,
    })
    
    if (!result.success) {
      // - HANDLE RATE LIMIT - \\
      if (result.error?.type === error_type.rate_limit) {
        set_rate_limit_cooldown(rate_key, 60000)
        
        if (cached_user) {
          __log.warn("Rate limited, returning stale cache:", discord_id)
          return { success: true, data: cached_user }
        }
      }
      
      // - RETURN STALE CACHE ON ERROR - \\
      if (cached_user && cache_age < __users_cache_stale_while_revalidate) {
        __log.warn("Request failed, returning stale cache:", discord_id)
        return { success: true, data: cached_user }
      }
      
      return { success: false, error: result.error?.message || "Failed to fetch user", is_error: true }
    }
    
    const data = result.data
    let user_data: luarmor_user | null = null
    
    if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
      user_data = data.users[0]
    } else if (data?.user_key) {
      user_data = data
    } else if (Array.isArray(data) && data.length > 0) {
      user_data = data[0]
    }
    
    if (user_data) {
      __user_cache.set(discord_id, user_data)
      __user_cache_timestamp.set(discord_id, now)
      return { success: true, data: user_data }
    }
    
    return { success: false, error: "User not found", is_error: false }
  })
}

/**
 * - GET USER BY USER KEY - \\
 * @param user_key User key
 * @returns Response with user data
 */
export async function get_user_by_key(user_key: string): Promise<luarmor_response<luarmor_user>> {
  if (!validate_user_key(user_key)) {
    return { success: false, error: "Invalid user key format" }
  }
  
  const cache_key = `key:${user_key}`
  
  return deduplicate_request(cache_key, async () => {
    const url = `${__base_url}/projects/${get_project_id()}/users?user_key=${user_key}`
    
    const result = await make_request<any>(url, {
      method  : "GET",
      timeout : __fast_timeout,
    })
    
    if (!result.success) {
      return { success: false, error: result.error?.message || "Failed to fetch user" }
    }
    
    const data      = result.data
    const user_data = data?.users?.[0] || (data?.user_key ? data : null) || (Array.isArray(data) ? data[0] : null)
    
    if (user_data) {
      return { success: true, data: user_data }
    }
    
    return { success: false, error: data?.message || "User not found" }
  })
}

/**
 * - RESET HWID BY DISCORD ID - \\
 * @param discord_id Discord ID
 * @returns Response
 */
export async function reset_hwid_by_discord(discord_id: string): Promise<luarmor_response<null>> {
  if (!validate_discord_id(discord_id)) {
    return { success: false, error: "Invalid Discord ID format" }
  }
  
  const cache_key = `reset_hwid:${discord_id}`
  
  return deduplicate_request(cache_key, async () => {
    // - CHECK RATE LIMIT - \\
    const rate_key = `reset:${discord_id}`
    if (is_rate_limited(rate_key)) {
      return { success: false, error: "Please wait before resetting HWID again" }
    }
    
    const url = `${__base_url}/projects/${get_project_id()}/users/resethwid`
    
    const result = await make_request<any>(url, {
      method  : "POST",
      body    : { discord_id },
      timeout : __fast_timeout,
    })
    
    if (!result.success) {
      // - SET COOLDOWN ON RATE LIMIT - \\
      if (result.error?.type === error_type.rate_limit) {
        set_rate_limit_cooldown(rate_key, 60000)
      }
      
      return { success: false, error: result.error?.message || "Failed to reset HWID" }
    }
    
    const data = result.data
    
    if (data?.success === true || data?.message?.toLowerCase().includes("success")) {
      __user_cache.delete(discord_id)
      __user_cache_timestamp.delete(discord_id)
      return { success: true, message: "HWID reset successfully" }
    }
    
    return { success: false, error: data?.message || "Failed to reset HWID" }
  })
}

/**
 * - RESET HWID BY USER KEY - \\
 * @param user_key User key
 * @returns Response
 */
export async function reset_hwid_by_key(user_key: string): Promise<luarmor_response<null>> {
  if (!validate_user_key(user_key)) {
    return { success: false, error: "Invalid user key format" }
  }
  
  const cache_key = `reset_hwid_key:${user_key}`
  
  return deduplicate_request(cache_key, async () => {
    const url = `${__base_url}/projects/${get_project_id()}/users/resethwid`
    
    const result = await make_request<any>(url, {
      method : "POST",
      body   : { user_key },
      timeout: __fast_timeout,
    })
    
    if (!result.success) {
      return { success: false, error: result.error?.message || "Failed to reset HWID" }
    }
    
    const data = result.data
    
    if (data?.success === true || data?.message?.toLowerCase().includes("success")) {
      return { success: true, message: "HWID reset successfully" }
    }
    
    return { success: false, error: data?.message || "Failed to reset HWID" }
  })
}

/**
 * - LINK DISCORD ACCOUNT - \\
 * @param user_key User key
 * @param discord_id Discord ID
 * @returns Response
 */
export async function link_discord(user_key: string, discord_id: string): Promise<luarmor_response<null>> {
  if (!validate_user_key(user_key)) {
    return { success: false, error: "Invalid user key format" }
  }
  
  if (!validate_discord_id(discord_id)) {
    return { success: false, error: "Invalid Discord ID format" }
  }
  
  const url = `${__base_url}/projects/${get_project_id()}/users/linkdiscord`
  
  const result = await make_request<any>(url, {
    method  : "POST",
    body    : { user_key, discord_id },
    timeout : __fast_timeout,
  })
  
  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to link Discord" }
  }
  
  const data = result.data
  
  if (data?.success === true || data?.message?.toLowerCase().includes("success")) {
    __user_cache.delete(discord_id)
    __user_cache_timestamp.delete(discord_id)
    return { success: true, message: "Discord linked successfully" }
  }
  
  return { success: false, error: data?.message || "Failed to link Discord" }
}

/**
 * - GET API STATS - \\
 * @returns Response with stats
 */
export async function get_stats(): Promise<luarmor_response<luarmor_stats>> {
  return deduplicate_request("stats", async () => {
    const url = `${__base_url}/keys/${get_api_key()}/stats`
    
    const result = await make_request<any>(url, {
      method  : "GET",
      timeout : __fast_timeout,
    })
    
    if (!result.success) {
      return { success: false, error: result.error?.message || "Failed to get stats" }
    }
    
    const data = result.data
    
    if (data?.total_users !== undefined) {
      return { success: true, data }
    }
    
    return { success: false, error: data?.message || "Failed to get stats" }
  })
}

/**
 * - GET ALL USERS - \\
 * @returns Response with user list
 */
export async function get_all_users(): Promise<luarmor_response<luarmor_user[]>> {
  return deduplicate_request("all_users", async () => {
    const now = Date.now()
    
    // - RETURN FRESH CACHE - \\
    if (__users_cache && (now - __users_cache_timestamp) < __users_cache_duration) {
      __log.debug("Cache hit (fresh): all_users")
      return { success: true, data: __users_cache }
    }
    
    const url = `${__base_url}/projects/${get_project_id()}/users`
    
    const result = await make_request<any>(url, {
      method  : "GET",
      timeout : __default_timeout,
    })
    
    if (!result.success) {
      // - RETURN STALE CACHE ON ERROR - \\
      if (__users_cache && (now - __users_cache_timestamp) < __users_cache_stale_while_revalidate) {
        __log.warn("Request failed, returning stale cache: all_users")
        return { success: true, data: __users_cache }
      }
      
      return { success: false, error: result.error?.message || "Failed to get users" }
    }
    
    const data = result.data
    
    if (data?.users && Array.isArray(data.users)) {
      __users_cache           = data.users
      __users_cache_timestamp = now
      return { success: true, data: data.users }
    }
    
    if (Array.isArray(data)) {
      __users_cache           = data
      __users_cache_timestamp = now
      return { success: true, data }
    }
    
    return { success: false, error: data?.message || "Failed to get users" }
  })
}

/**
 * - UPDATE PROJECT SETTINGS - \\
 * @param project_id Project ID
 * @param hwidless Enable/disable HWID requirement
 * @returns Response
 */
export async function update_project_settings(project_id: string, hwidless: boolean): Promise<luarmor_response<any>> {
  const get_url = `${__base_url}/projects/${project_id}`
  
  let current_settings: any = {
    name                      : "Service Provider",
    reset_hwid_cooldown       : 0,
    alerts_webhook            : env.get("LUARMOR_ALERTS_WEBHOOK", ""),
    executions_webhook        : env.get("LUARMOR_EXECUTIONS_WEBHOOK", ""),
    auto_delete_expired_users : false,
    allow_hwid_cloned_keys    : true,
    instance_limit            : false,
    instance_limit_count      : 0,
  }
  
  // - GET CURRENT SETTINGS - \\
  const get_result = await make_request<any>(get_url, {
    method  : "GET",
    timeout : __fast_timeout,
  })
  
  if (get_result.success && get_result.data) {
    const data = get_result.data
    current_settings = {
      name                      : data.name || current_settings.name,
      reset_hwid_cooldown       : data.reset_hwid_cooldown ?? current_settings.reset_hwid_cooldown,
      alerts_webhook            : data.alerts_webhook ?? current_settings.alerts_webhook,
      executions_webhook        : data.executions_webhook ?? current_settings.executions_webhook,
      auto_delete_expired_users : data.auto_delete_expired_users ?? current_settings.auto_delete_expired_users,
      allow_hwid_cloned_keys    : data.allow_hwid_cloned_keys ?? current_settings.allow_hwid_cloned_keys,
      instance_limit            : data.instance_limit ?? current_settings.instance_limit,
      instance_limit_count      : data.instance_limit_count ?? current_settings.instance_limit_count,
    }
  }
  
  // - UPDATE SETTINGS - \\
  const url  = `${__base_url}/projects/${project_id}`
  const body = { ...current_settings, hwidless }
  
  const result = await make_request<any>(url, {
    method  : "PATCH",
    body    : body,
    timeout : __fast_timeout,
  })
  
  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to update project settings" }
  }
  
  const data = result.data
  
  if (data?.success) {
    return { success: true, data }
  }
  
  return { success: false, error: data?.message || "Failed to update project settings" }
}

/**
 * - UNBAN USER - \\
 * @param unban_token Unban token
 * @param project_id Optional project ID
 * @returns Response
 */
export async function unban_user(unban_token: string, project_id?: string): Promise<luarmor_response<null>> {
  const pid = project_id || get_project_id()
  const url = `${__base_url}/projects/${pid}/users/unban?unban_token=${unban_token}`
  
  const result = await make_request<any>(url, {
    method  : "GET",
    timeout : __fast_timeout,
  })
  
  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to unban user" }
  }
  
  const data = result.data
  
  if (data?.success === true || data?.message?.toLowerCase().includes("success")) {
    return { success: true, message: "User unbanned successfully" }
  }
  
  return { success: false, error: data?.message || "Failed to unban user" }
}

/**
 * - BATCH GET USERS - \\
 * @param discord_ids Array of Discord IDs
 * @param project_id Optional project ID
 * @returns Map of discord_id -> user data
 */
export async function get_users_batch(
  discord_ids: string[], 
  project_id?: string
): Promise<Map<string, luarmor_user>> {
  const results = new Map<string, luarmor_user>()
  
  const promises = discord_ids.map(async (discord_id) => {
    const response = await get_user_by_discord(discord_id, project_id)
    if (response.success && response.data) {
      results.set(discord_id, response.data)
    }
  })
  
  await Promise.all(promises)
  return results
}

/**
 * - BATCH RESET HWID - \\
 * @param discord_ids Array of Discord IDs
 * @returns Map of discord_id -> result
 */
export async function reset_hwid_batch(
  discord_ids: string[]
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>()
  
  const promises = discord_ids.map(async (discord_id) => {
    const response = await reset_hwid_by_discord(discord_id)
    results.set(discord_id, { 
      success : response.success, 
      error   : response.error,
    })
  })
  
  await Promise.all(promises)
  return results
}

export function get_execution_rank(users: luarmor_user[], discord_id: string): { rank: number; total: number } {
  const sorted_users = [...users].sort((a, b) => b.total_executions - a.total_executions)
  const rank         = sorted_users.findIndex(u => u.discord_id === discord_id) + 1
  return { rank: rank > 0 ? rank : 0, total: users.length }
}

export function get_loader_script(user_key: string): string {
  return `loadstring(game:HttpGet("https://api.luarmor.net/files/v3/loaders/${get_project_id()}.lua"))()`
}

export function get_full_loader_script(user_key: string): string {
  return [
    `script_key="${user_key}";`,
    `loadstring(game:HttpGet("https://raw.githubusercontent.com/bimoraa/Euphoria/refs/heads/main/loader.luau"))()`,
  ].join("\n")
}

/**
 * - INVALIDATE USER CACHE - \\
 * @param discord_id Discord ID
 */
export function invalidate_user_cache(discord_id: string): void {
  __user_cache.delete(discord_id)
  __user_cache_timestamp.delete(discord_id)
}

/**
 * - INVALIDATE ALL USERS CACHE - \\
 */
export function invalidate_all_users_cache(): void {
  __users_cache           = null
  __users_cache_timestamp = 0
}

/**
 * - CLEAR ALL CACHE - \\
 */
export function clear_all_cache(): void {
  __user_cache.clear()
  __user_cache_timestamp.clear()
  __users_cache           = null
  __users_cache_timestamp = 0
  __pending_requests.clear()
  __rate_limit_cooldowns.clear()
}

/**
 * - GET CIRCUIT BREAKER STATUS - \\
 * @returns Circuit breaker information
 */
export function get_circuit_status(): { 
  open: boolean
  failures: number
  last_failure: number 
} {
  return {
    open         : is_circuit_open(),
    failures     : __circuit_breaker_failures,
    last_failure : __circuit_breaker_last_failure,
  }
}
