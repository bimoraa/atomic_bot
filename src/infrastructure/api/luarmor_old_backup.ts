import { http, logger, env } from "../../shared/utils"

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

// - PERFORMANCE OPTIMIZATION - \\
const __default_timeout                               = 5000
const __fast_timeout                                  = 3000
const __hwid_reset_timeout                            = 2000

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_project_id(): string {
  return env.required("LUARMOR_PROJECT_ID")
}

function check_rate_limit(response: any): string | null {
  const message = response.message?.toLowerCase() || ""
  if (message.includes("ratelimit") || message.includes("too many requests")) {
    return "Failed to connect to server. Please try again in a minute."
  }
  return null
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

function get_headers(): Record<string, string> {
  return {
    Authorization      : get_api_key(),
    "Accept-Encoding"  : "gzip, deflate, br",
    "Connection"       : "keep-alive",
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
  if (existing) return existing as Promise<T>
  
  const promise = fn().finally(() => {
    __pending_requests.delete(key)
  })
  
  __pending_requests.set(key, promise)
  return promise
}

export async function create_key(options: create_key_options = {}): Promise<luarmor_response<luarmor_user>> {
  try {
    const url = `${__base_url}/projects/${get_project_id()}/users`

    const body: Record<string, any> = {}

    if (options.discord_id)  body.discord_id  = options.discord_id
    if (options.identifier)  body.identifier  = options.identifier
    if (options.note)        body.note        = options.note
    if (options.auth_expire) body.auth_expire = options.auth_expire

    const response = await http.request<any>(url, {
      method  : "POST",
      body,
      headers : get_headers(),
      timeout : __fast_timeout,
    })

    if (response.data.user_key) {
      return { success: true, data: response.data }
    }

    return { success: false, error: response.data.message || "Failed to create key" }
  } catch (error) {
    __log.error("Failed to create key:", error)
    return { success: false, error: "Request failed" }
  }
}

export async function create_key_for_project(project_id: string, options: create_key_options = {}): Promise<luarmor_response<luarmor_user>> {
  try {
    const url = `${__base_url}/projects/${project_id}/users`

    const body: Record<string, any> = {}

    if (options.discord_id)  body.discord_id  = options.discord_id
    if (options.identifier)  body.identifier  = options.identifier
    if (options.note)        body.note        = options.note
    if (options.auth_expire) body.auth_expire = options.auth_expire

    const response = await http.request<any>(url, {
      method  : "POST",
      body,
      headers : get_headers(),
      timeout : __fast_timeout,
    })

    if (response.data.user_key) {
      return { success: true, data: response.data }
    }

    return { success: false, error: response.data.message || "Failed to create key" }
  } catch (error) {
    __log.error("Failed to create key for project:", error)
    return { success: false, error: "Request failed" }
  }
}

export async function delete_user_from_project(project_id: string, discord_id: string): Promise<boolean> {
  try {
    const check_url = `${__base_url}/projects/${project_id}/users?discord_id=${discord_id}`
    const check_res = await http.request<any>(check_url, {
      method  : "GET",
      headers : get_headers(),
      timeout : __fast_timeout,
    })

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

    if (user_keys.length === 0) return true

    // - PARALLEL DELETE REQUESTS - \\
    const delete_promises = user_keys.map(async (key) => {
      const delete_url = `${__base_url}/projects/${project_id}/users?user_key=${key}`
      try {
        const delete_res = await http.request<any>(delete_url, {
          method  : "DELETE",
          headers : get_headers(),
          timeout : __fast_timeout,
        })

        return delete_res.data?.success === true || delete_res.data?.message?.toLowerCase().includes("deleted")
      } catch {
        return false
      }
    })

    const results = await Promise.all(delete_promises)
    const failed  = results.filter(r => !r).length

    return failed === 0
  } catch (error) {
    __log.error("Failed to delete user:", error)
    return false
  }
}

export async function get_user_by_discord(discord_id: string, project_id?: string): Promise<luarmor_response<luarmor_user>> {
  const cache_key = `discord:${discord_id}:${project_id || "default"}`
  
  return deduplicate_request(cache_key, async () => {
    const now         = Date.now()
    const cached_user = __user_cache.get(discord_id)
    const cached_time = __user_cache_timestamp.get(discord_id) || 0
    const cache_age   = now - cached_time

    // - RETURN FRESH CACHE - \\
    if (cached_user && cache_age < __user_cache_duration && !project_id) {
      return { success: true, data: cached_user }
    }

    // - STALE-WHILE-REVALIDATE: Use stale cache while fetching in background - \\
    const is_stale = cached_user && cache_age < (__user_cache_duration + 5 * 60 * 1000)

    try {
      const pid = project_id || get_project_id()
      const url = `${__base_url}/projects/${pid}/users?discord_id=${discord_id}`
      
      const response = await http.request<any>(url, {
        method  : "GET",
        headers : get_headers(),
        timeout : __fast_timeout,
      })

      const data             = response.data
      const rate_limit_error = check_rate_limit(data)
      
      if (rate_limit_error) {
        if (cached_user) return { success: true, data: cached_user }
        return { success: false, error: rate_limit_error, is_error: true }
      }

      let user_data: luarmor_user | null = null

      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        user_data = data.users[0]
      } else if (data.user_key) {
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
    } catch (error) {
      // - RETURN STALE CACHE ON ERROR - \\
      if (is_stale) {
        __log.warn("Request failed, returning stale cache for", discord_id)
        return { success: true, data: cached_user! }
      }
      return { success: false, error: "Failed to connect to server.", is_error: true }
    }
  })
}

export async function get_user_by_key(user_key: string): Promise<luarmor_response<luarmor_user>> {
  const cache_key = `key:${user_key}`
  
  return deduplicate_request(cache_key, async () => {
    try {
      const url = `${__base_url}/projects/${get_project_id()}/users?user_key=${user_key}`
      
      const response = await http.request<any>(url, {
        method  : "GET",
        headers : get_headers(),
        timeout : __fast_timeout,
      })

      const data             = response.data
      const rate_limit_error = check_rate_limit(data)
      
      if (rate_limit_error) return { success: false, error: rate_limit_error }

      const user_data = data.users?.[0] || (data.user_key ? data : null) || (Array.isArray(data) ? data[0] : null)
      if (user_data) return { success: true, data: user_data }

      return { success: false, error: data.message || "User not found" }
    } catch (error) {
      return { success: false, error: "Failed to connect to server." }
    }
  })
}

export async function reset_hwid_by_discord(discord_id: string): Promise<luarmor_response<null>> {
  const cache_key = `reset_hwid:${discord_id}`
  
  return deduplicate_request(cache_key, async () => {
    try {
      const response = await http.request<any>(`${__base_url}/projects/${get_project_id()}/users/resethwid`, {
        method  : "POST",
        body    : { discord_id },
        headers : get_headers(),
      })

      const data = response.data
      
      // - FAST PATH: Early return on success - \\
      if (data.success === true || data.message?.toLowerCase().includes("success")) {
        __user_cache.delete(discord_id)
        __user_cache_timestamp.delete(discord_id)
        return { success: true, message: "HWID reset successfully" }
      }

      // - Rate limit check only on failure - \\
      const rate_limit_error = check_rate_limit(data)
      if (rate_limit_error) return { success: false, error: rate_limit_error }

      return { success: false, error: data.message || "Failed to reset HWID" }
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to connect to server." }
    }
  })
}

export async function reset_hwid_by_key(user_key: string): Promise<luarmor_response<null>> {
  const cache_key = `reset_hwid_key:${user_key}`
  
  return deduplicate_request(cache_key, async () => {
    try {
      const response = await http.request<any>(`${__base_url}/projects/${get_project_id()}/users/resethwid`, {
        method  : "POST",
        body    : { user_key },
        headers : get_headers(),
      })

      const data = response.data
      
      // - FAST PATH: Early return on success - \\
      if (data.success === true || data.message?.toLowerCase().includes("success")) {
        return { success: true, message: "HWID reset successfully" }
      }

      const rate_limit_error = check_rate_limit(data)
      if (rate_limit_error) return { success: false, error: rate_limit_error }

      return { success: false, error: data.message || "Failed to reset HWID" }
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to connect to server." }
    }
  })
}

export async function link_discord(user_key: string, discord_id: string): Promise<luarmor_response<null>> {
  try {
    const url  = `${__base_url}/projects/${get_project_id()}/users/linkdiscord`
    const body = { user_key, discord_id }
    
    const response = await http.request<any>(url, {
      method  : "POST",
      body,
      headers : get_headers(),
      timeout : __fast_timeout,
    })

    const data             = response.data
    const rate_limit_error = check_rate_limit(data)
    
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (data.success === true || data.message?.toLowerCase().includes("success")) {
      // - INVALIDATE CACHE ON DISCORD LINK - \\
      __user_cache.delete(discord_id)
      __user_cache_timestamp.delete(discord_id)
      return { success: true, message: "Discord linked successfully" }
    }

    return { success: false, error: data.message || "Failed to link Discord" }
  } catch (error) {
    __log.error("Failed to link Discord:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function get_stats(): Promise<luarmor_response<luarmor_stats>> {
  return deduplicate_request("stats", async () => {
    try {
      const url = `${__base_url}/keys/${get_api_key()}/stats`
      
      const response = await http.request<any>(url, {
        method  : "GET",
        headers : get_headers(),
        timeout : __fast_timeout,
      })

      const data             = response.data
      const rate_limit_error = check_rate_limit(data)
      
      if (rate_limit_error) {
        return { success: false, error: rate_limit_error }
      }

      if (data.total_users !== undefined) {
        return { success: true, data }
      }

      return { success: false, error: data.message || "Failed to get stats" }
    } catch (error) {
      __log.error("Failed to get stats:", error)
      return { success: false, error: "Failed to connect to server." }
    }
  })
}

export async function get_all_users(): Promise<luarmor_response<luarmor_user[]>> {
  return deduplicate_request("all_users", async () => {
    const now = Date.now()

    // - RETURN FRESH CACHE - \\
    if (__users_cache && (now - __users_cache_timestamp) < __users_cache_duration) {
      return { success: true, data: __users_cache }
    }

    // - STALE-WHILE-REVALIDATE - \\
    const has_stale_cache = __users_cache && (now - __users_cache_timestamp) < __users_cache_stale_while_revalidate

    try {
      const url = `${__base_url}/projects/${get_project_id()}/users`
      
      const response = await http.request<any>(url, {
        method  : "GET",
        headers : get_headers(),
        timeout : __default_timeout,
      })

      const data             = response.data
      const rate_limit_error = check_rate_limit(data)
      
      if (rate_limit_error) {
        if (__users_cache) {
          __log.info("Rate limited, returning stale users cache")
          return { success: true, data: __users_cache }
        }
        return { success: false, error: rate_limit_error }
      }

      if (data.users && Array.isArray(data.users)) {
        __users_cache           = data.users
        __users_cache_timestamp = now
        return { success: true, data: data.users }
      }

      if (Array.isArray(data)) {
        __users_cache           = data
        __users_cache_timestamp = now
        return { success: true, data }
      }

      return { success: false, error: data.message || "Failed to get users" }
    } catch (error) {
      __log.error("Failed to get all users:", error)
      if (has_stale_cache) {
        __log.info("Error occurred, returning stale users cache")
        return { success: true, data: __users_cache! }
      }
      return { success: false, error: "Failed to connect to server." }
    }
  })
}

export function get_execution_rank(users: luarmor_user[], discord_id: string): { rank: number, total: number } {
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

export async function update_project_settings(project_id: string, hwidless: boolean): Promise<luarmor_response<any>> {
  try {
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

    try {
      const get_response = await http.request<any>(get_url, {
        method  : "GET",
        headers : get_headers(),
        timeout : __fast_timeout,
      })
      
      const data = get_response.data
      if (data && data.name) {
        current_settings = {
          name                      : data.name,
          reset_hwid_cooldown       : data.reset_hwid_cooldown ?? 0,
          alerts_webhook            : data.alerts_webhook ?? "",
          executions_webhook        : data.executions_webhook ?? "",
          auto_delete_expired_users : data.auto_delete_expired_users ?? false,
          allow_hwid_cloned_keys    : data.allow_hwid_cloned_keys ?? true,
          instance_limit            : data.instance_limit ?? false,
          instance_limit_count      : data.instance_limit_count ?? 0,
        }
      }
    } catch (get_error) {
      __log.warn("Failed to fetch current settings, using defaults:", get_error)
    }

    const url = `${__base_url}/projects/${project_id}`

    const body = {
      ...current_settings,
      hwidless: hwidless,
    }

    const response = await http.request<any>(url, {
      method  : "PATCH",
      body,
      headers : get_headers(),
      timeout : __fast_timeout,
    })

    const data = response.data
    if (data.success) {
      return { success: true, data }
    }

    const rate_limit_error = check_rate_limit(data)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    return { success: false, error: data.message || "Failed to update project settings" }
  } catch (error) {
    __log.error("Failed to update project settings:", error)
    return { success: false, error: "An error occurred" }
  }
}

export async function unban_user(unban_token: string, project_id?: string): Promise<luarmor_response<null>> {
  try {
    const pid = project_id || get_project_id()
    const url = `${__base_url}/projects/${pid}/users/unban?unban_token=${unban_token}`
    
    const response = await http.request<any>(url, {
      method  : "GET",
      headers : get_headers(),
      timeout : __fast_timeout,
    })

    const data             = response.data
    const rate_limit_error = check_rate_limit(data)
    
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (data.success === true || data.message?.toLowerCase().includes("success")) {
      return { success: true, message: "User unbanned successfully" }
    }

    return { success: false, error: data.message || "Failed to unban user" }
  } catch (error) {
    __log.error("Failed to unban user:", error)
    return { success: false, error: "Failed to connect to server" }
  }
}

/**
 * - BATCH GET USERS BY DISCORD IDS - \\
 * @param discord_ids Array of Discord IDs to fetch
 * @param project_id Optional project ID
 * @returns Map of discord_id -> user data
 */
export async function get_users_batch(discord_ids: string[], project_id?: string): Promise<Map<string, luarmor_user>> {
  const results = new Map<string, luarmor_user>()
  
  // - PARALLEL REQUESTS WITH DEDUPLICATION - \\
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
 * - BATCH RESET HWID FOR MULTIPLE USERS - \\
 * @param discord_ids Array of Discord IDs to reset
 * @returns Map of discord_id -> success status
 */
export async function reset_hwid_batch(discord_ids: string[]): Promise<Map<string, { success: boolean, error?: string }>> {
  const results = new Map<string, { success: boolean, error?: string }>()
  
  // - PARALLEL HWID RESETS - \\
  const promises = discord_ids.map(async (discord_id) => {
    const response = await reset_hwid_by_discord(discord_id)
    results.set(discord_id, { 
      success: response.success, 
      error: response.error 
    })
  })
  
  await Promise.all(promises)
  return results
}

/**
 * - INVALIDATE USER CACHE - \\
 * @param discord_id Discord ID to clear from cache
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
}
