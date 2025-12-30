import { Client } from "discord.js"
import { db } from "../../utils"
import { log_error } from "../../utils/error_logger"
import * as luarmor from "../../services/luarmor"

const SETTINGS_COLLECTION = "service_provider_settings"
const RESET_COLLECTION    = "service_provider_resets"
const RESET_COOLDOWN_MS   = 30000

interface service_provider_settings {
  _id?            : any
  under_ratelimit : boolean
  updated_at      : number
  updated_by?     : string
}

interface reset_record {
  _id?           : any
  user_id        : string
  last_reset_at  : number
}

export async function set_under_ratelimit(options: { client: Client; under_ratelimit: boolean; updated_by: string }): Promise<boolean> {
  try {
    const now = Date.now()

    await db.update_one<service_provider_settings>(
      SETTINGS_COLLECTION,
      { _id: "config" },
      {
        under_ratelimit : options.under_ratelimit,
        updated_at      : now,
        updated_by      : options.updated_by,
      },
      true
    )

    return true
  } catch (error) {
    await log_error(options.client, error as Error, "set_under_ratelimit", {
      under_ratelimit: options.under_ratelimit,
      updated_by     : options.updated_by,
    })
    return false
  }
}

export async function get_under_ratelimit(options: { client: Client }): Promise<boolean> {
  try {
    const settings = await db.find_one<service_provider_settings>(SETTINGS_COLLECTION, { _id: "config" })

    return settings?.under_ratelimit === true
  } catch (error) {
    await log_error(options.client, error as Error, "get_under_ratelimit", {})
    return false
  }
}

export async function check_reset_cooldown(options: { client: Client; user_id: string }): Promise<{ allowed: boolean; remaining_ms?: number }> {
  try {
    const under_ratelimit = await get_under_ratelimit({ client: options.client })

    if (!under_ratelimit) {
      return { allowed: true }
    }

    const record = await db.find_one<reset_record>(RESET_COLLECTION, { user_id: options.user_id })
    const now    = Date.now()

    if (record && now - record.last_reset_at < RESET_COOLDOWN_MS) {
      const remaining_ms = RESET_COOLDOWN_MS - (now - record.last_reset_at)

      return {
        allowed      : false,
        remaining_ms : remaining_ms,
      }
    }

    await db.update_one<reset_record>(
      RESET_COLLECTION,
      { user_id: options.user_id },
      {
        user_id       : options.user_id,
        last_reset_at : now,
      },
      true
    )

    return { allowed: true }
  } catch (error) {
    await log_error(options.client, error as Error, "check_reset_cooldown", {
      user_id: options.user_id,
    })
    return { allowed: true }
  }
}

export async function get_user_script(options: { client: Client; user_id: string }): Promise<{ success: boolean; script?: string; error?: string }> {
  try {
    const user_result = await luarmor.get_user_by_discord(options.user_id)

    if (!user_result.success || !user_result.data) {
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

export async function reset_user_hwid(options: { client: Client; user_id: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cooldown = await check_reset_cooldown({ client: options.client, user_id: options.user_id })

    if (!cooldown.allowed) {
      const remaining_seconds = Math.ceil((cooldown.remaining_ms || 0) / 1000)
      return {
        success : false,
        error   : `Please wait ${remaining_seconds} seconds before resetting again.`,
      }
    }

    const user_result = await luarmor.get_user_by_discord(options.user_id)

    if (!user_result.success || !user_result.data) {
      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const reset_result = await luarmor.reset_hwid_by_key(user_result.data.user_key)

    if (reset_result.success) {
      return {
        success : true,
        message : "HWID reset successfully",
      }
    } else {
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
    const user_result = await luarmor.get_user_by_discord(options.user_id)

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

