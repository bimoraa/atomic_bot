import { http, logger, env } from "../utils"

const __base_url = "https://api.luarmor.net/v3"
const __log      = logger.create_logger("luarmor")

let __users_cache: luarmor_user[] | null = null
let __cache_timestamp                    = 0
const __cache_duration                   = 2 * 60 * 1000

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
    Authorization : get_api_key(),
  }
}

export async function create_key(options: create_key_options = {}): Promise<luarmor_response<luarmor_user>> {
  try {
    const url = `${__base_url}/projects/${get_project_id()}/users`

    const body: Record<string, any> = {}

    if (options.discord_id)  body.discord_id  = options.discord_id
    if (options.identifier)  body.identifier  = options.identifier
    if (options.note)        body.note        = options.note
    if (options.auth_expire) body.auth_expire = options.auth_expire

    const response = await http.post<any>(url, body, get_headers())

    if (response.user_key) {
      return { success: true, data: response }
    }

    return { success: false, error: response.message || "Failed to create key" }
  } catch (error) {
    __log.error("Failed to create key:", error)
    return { success: false, error: "Request failed" }
  }
}

export async function get_user_by_discord(discord_id: string): Promise<luarmor_response<luarmor_user>> {
  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users?discord_id=${discord_id}`
    const response = await http.get<any>(url, get_headers())

    __log.info("Luarmor get_user_by_discord response:", JSON.stringify(response))

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error, is_error: true }
    }

    if (response.users && Array.isArray(response.users) && response.users.length > 0) {
      return { success: true, data: response.users[0] }
    }

    if (response.user_key) {
      return { success: true, data: response }
    }

    if (Array.isArray(response) && response.length > 0) {
      return { success: true, data: response[0] }
    }

    return { success: false, error: "User not found", is_error: false }
  } catch (error) {
    __log.error("Failed to get user:", error)
    return { success: false, error: "Failed to connect to server.", is_error: true }
  }
}

export async function get_user_by_key(user_key: string): Promise<luarmor_response<luarmor_user>> {
  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users?user_key=${user_key}`
    const response = await http.get<any>(url, get_headers())

    __log.info("Luarmor get_user_by_key response:", JSON.stringify(response))

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.users && Array.isArray(response.users) && response.users.length > 0) {
      return { success: true, data: response.users[0] }
    }

    if (response.user_key) {
      return { success: true, data: response }
    }

    if (Array.isArray(response) && response.length > 0) {
      return { success: true, data: response[0] }
    }

    return { success: false, error: response.message || "User not found" }
  } catch (error) {
    __log.error("Failed to get user by key:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function reset_hwid_by_discord(discord_id: string): Promise<luarmor_response<null>> {
  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users/resethwid`
    const body     = { discord_id }
    const response = await http.post<any>(url, body, get_headers())

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.success === true || response.message?.toLowerCase().includes("success")) {
      return { success: true, message: "HWID reset successfully" }
    }

    return { success: false, error: response.message || "Failed to reset HWID" }
  } catch (error) {
    __log.error("Failed to reset HWID:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function reset_hwid_by_key(user_key: string): Promise<luarmor_response<null>> {
  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users/resethwid`
    const body     = { user_key }
    const response = await http.post<any>(url, body, get_headers())

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.success === true || response.message?.toLowerCase().includes("success")) {
      return { success: true, message: "HWID reset successfully" }
    }

    return { success: false, error: response.message || "Failed to reset HWID" }
  } catch (error) {
    __log.error("Failed to reset HWID:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function link_discord(user_key: string, discord_id: string): Promise<luarmor_response<null>> {
  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users/linkdiscord`
    const body     = { user_key, discord_id }
    const response = await http.post<any>(url, body, get_headers())

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.success === true || response.message?.toLowerCase().includes("success")) {
      return { success: true, message: "Discord linked successfully" }
    }

    return { success: false, error: response.message || "Failed to link Discord" }
  } catch (error) {
    __log.error("Failed to link Discord:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function get_stats(): Promise<luarmor_response<luarmor_stats>> {
  try {
    const url      = `${__base_url}/keys/${get_api_key()}/stats`
    const response = await http.get<any>(url, get_headers())

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.total_users !== undefined) {
      return { success: true, data: response }
    }

    return { success: false, error: response.message || "Failed to get stats" }
  } catch (error) {
    __log.error("Failed to get stats:", error)
    return { success: false, error: "Failed to connect to server." }
  }
}

export async function get_all_users(): Promise<luarmor_response<luarmor_user[]>> {
  const now = Date.now()

  if (__users_cache && (now - __cache_timestamp) < __cache_duration) {
    return { success: true, data: __users_cache }
  }

  try {
    const url      = `${__base_url}/projects/${get_project_id()}/users`
    const response = await http.get<any>(url, get_headers())

    const rate_limit_error = check_rate_limit(response)
    if (rate_limit_error) {
      return { success: false, error: rate_limit_error }
    }

    if (response.users && Array.isArray(response.users)) {
      __users_cache     = response.users
      __cache_timestamp = now
      return { success: true, data: response.users }
    }

    if (Array.isArray(response)) {
      __users_cache     = response
      __cache_timestamp = now
      return { success: true, data: response }
    }

    return { success: false, error: response.message || "Failed to get users" }
  } catch (error) {
    __log.error("Failed to get all users:", error)
    return { success: false, error: "Failed to connect to server." }
  }
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
