import { Client } from "discord.js"
import { db, component } from "../../utils"
import { log_error } from "../../utils/error_logger"
import * as luarmor from "../../services/luarmor"

const RESET_COLLECTION      = "service_provider_resets"
const USER_CACHE_COLLECTION = "service_provider_user_cache"
const CACHE_DURATION_MS     = 60 * 60 * 1000

function is_rate_limited(error_message?: string): boolean {
  if (!error_message) return false
  const msg = error_message.toLowerCase()
  return msg.includes("ratelimit") || msg.includes("rate limit") || msg.includes("too many requests")
}

function create_rate_limit_message(feature_name: string) {
  const retry_timestamp = Math.floor(Date.now() / 1000) + 60
  
  return component.build_message({
    components: [
      component.container({
        accent_color: 15277667,
        components: [
          component.text("## Error!"),
        ],
      }),
      component.container({
        components: [
          component.text([
            "**Sorry for the inconvenience.**",
            `The **${feature_name}** feature is currently having an issue and has been **rate-limited by Luarmor**.`,
          ]),
          component.separator(2),
          component.text("HWID reset may be disabled by the developer. You can execute the script directly in-game without resetting your HWID."),
        ],
      }),
      component.container({
        components: [
          component.text([
            `Please wait around **<t:${retry_timestamp}:R>** before trying again.`,
            "Thank you so much for your patience and understanding.",
          ]),
        ],
      }),
    ],
  })
}

interface reset_record {
  _id?           : any
  user_id        : string
  last_reset_at  : number
}

interface cached_user {
  _id?           : any
  user_id        : string
  user_data      : luarmor.luarmor_user
  cached_at      : number
  last_updated   : number
}

async function get_cached_user(user_id: string): Promise<luarmor.luarmor_user | null> {
  try {
    const cached = await db.find_one<cached_user>(USER_CACHE_COLLECTION, { user_id })
    
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.cached_at > CACHE_DURATION_MS) {
      return null
    }
    
    return cached.user_data
  } catch (error) {
    return null
  }
}

async function save_cached_user(user_id: string, user_data: luarmor.luarmor_user): Promise<void> {
  try {
    const now = Date.now()
    await db.update_one<cached_user>(
      USER_CACHE_COLLECTION,
      { user_id },
      {
        user_id,
        user_data,
        cached_at    : now,
        last_updated : now,
      },
      true
    )
  } catch (error) {
  }
}

async function get_user_with_cache(user_id: string, client: Client): Promise<{ success: boolean; data?: luarmor.luarmor_user; error?: string; from_cache?: boolean }> {
  const cached = await get_cached_user(user_id)
  
  if (cached) {
    return {
      success    : true,
      data       : cached,
      from_cache : true,
    }
  }
  
  const user_result = await luarmor.get_user_by_discord(user_id)
  
  if (user_result.success && user_result.data) {
    await save_cached_user(user_id, user_result.data)
    return {
      success    : true,
      data       : user_result.data,
      from_cache : false,
    }
  }
  
  return {
    success : false,
    error   : user_result.error,
  }
}

export async function get_user_script(options: { client: Client; user_id: string }): Promise<{ success: boolean; script?: string; error?: string; message?: any }> {
  try {
    const user_result = await get_user_with_cache(options.user_id, options.client)

    if (!user_result.success || !user_result.data) {
      if (is_rate_limited(user_result.error)) {
        return {
          success : false,
          message : create_rate_limit_message("Get Script"),
        }
      }
      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const loader_script = luarmor.get_full_loader_script(user_result.data.user_key)

    return {
      success : true,
      script  : loader_script,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "get_user_script", {
      user_id: options.user_id,
    })
    return {
      success : false,
      error   : "Failed to get script",
    }
  }
}

export async function reset_user_hwid(options: { client: Client; user_id: string }): Promise<{ success: boolean; message?: any; error?: string }> {
  try {
    const user_result = await luarmor.get_user_by_discord(options.user_id)

    if (!user_result.success || !user_result.data) {
      if (is_rate_limited(user_result.error)) {
        return {
          success : false,
          message : create_rate_limit_message("HWID Reset"),
        }
      }
      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const reset_result = await luarmor.reset_hwid_by_key(user_result.data.user_key)

    if (reset_result.success) {
      await save_cached_user(options.user_id, user_result.data)
      
      return {
        success : true,
        message : "HWID reset successfully",
      }
    } else {
      if (is_rate_limited(reset_result.error)) {
        return {
          success : false,
          message : create_rate_limit_message("HWID Reset"),
        }
      }
      return {
        success : false,
        error   : reset_result.error || "Failed to reset HWID",
      }
    }
  } catch (error) {
    await log_error(options.client, error as Error, "reset_user_hwid", {
      user_id: options.user_id,
    })
    return {
      success : false,
      error   : "Failed to reset HWID",
    }
  }
}

export async function get_user_stats(options: { client: Client; user_id: string }): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const user_result = await get_user_with_cache(options.user_id, options.client)

    if (!user_result.success || !user_result.data) {
      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const all_users_result = await luarmor.get_all_users()
    let leaderboard_text   = "Unable to fetch leaderboard"

    if (all_users_result.success && all_users_result.data) {
      const rank_info = luarmor.get_execution_rank(all_users_result.data, options.user_id)
      if (rank_info.rank > 0) {
        leaderboard_text = `You are #${rank_info.rank} of ${rank_info.total} users`
      } else {
        leaderboard_text = `Not ranked yet (${all_users_result.data.length} total users)`
      }
    }

    return {
      success : true,
      data    : {
        user             : user_result.data,
        leaderboard_text : leaderboard_text,
      },
    }
  } catch (error) {
    await log_error(options.client, error as Error, "get_user_stats", {
      user_id: options.user_id,
    })
    return {
      success : false,
      error   : "Failed to get stats",
    }
  }
}

export async function redeem_user_key(options: { client: Client; user_id: string; user_key: string }): Promise<{ success: boolean; message?: string; error?: string; script?: string }> {
  try {
    const existing_user = await luarmor.get_user_by_discord(options.user_id)

    if (existing_user.success && existing_user.data) {
      return {
        success : false,
        error   : "You already have a key linked to your Discord account",
      }
    }

    const verify_result = await luarmor.get_user_by_key(options.user_key)

    if (!verify_result.success || !verify_result.data) {
      return {
        success : false,
        error   : "Invalid key or key does not exist",
      }
    }

    if (verify_result.data.discord_id && verify_result.data.discord_id !== options.user_id) {
      return {
        success : false,
        error   : "This key is already linked to another Discord account",
      }
    }

    const link_result = await luarmor.link_discord(options.user_key, options.user_id)

    if (link_result.success) {
      if (verify_result.data) {
        await save_cached_user(options.user_id, verify_result.data)
      }
      
      const loader_script = luarmor.get_full_loader_script(options.user_key)
      return {
        success : true,
        message : "Key linked successfully",
        script  : loader_script,
      }
    } else {
      return {
        success : false,
        error   : link_result.error || "Failed to link key",
      }
    }
  } catch (error) {
    await log_error(options.client, error as Error, "redeem_user_key", {
      user_id  : options.user_id,
      user_key : options.user_key,
    })
    return {
      success : false,
      error   : "Failed to redeem key",
    }
  }
}

