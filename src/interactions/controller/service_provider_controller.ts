import { Client } from "discord.js"
import { db } from "../../utils"
import { log_error } from "../../utils/error_logger"

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
