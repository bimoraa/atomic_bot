import { db, cache } from "."

const is_production = process.env.NODE_ENV === "production"

const GUILD_SETTINGS_TTL = 5 * 60 * 1000 // - 5 minutes - \\

/**
 * - GENERATE CACHE KEY FOR GUILD SETTINGS - \\
 * @param {string} guild_id - Guild ID
 * @returns {string} Cache key
 */
function get_guild_cache_key(guild_id: string): string {
  return `guild_settings:${guild_id}`
}

/**
 * - INVALIDATE GUILD SETTINGS CACHE - \\
 * @param {string} guild_id - Guild ID
 * @returns {void}
 */
function invalidate_guild_cache(guild_id: string): void {
  cache.remove(get_guild_cache_key(guild_id))
}

export type guild_setting_key =
  | "welcome_channel"
  | "welcome_message"
  | "ticket_category"
  | "ticket_log_channel"
  | "mod_log_channel"
  | "member_log_channel"
  | "auto_role"
  | "verification_channel"
  | "rules_channel"
  | "announcements_channel"
  | "bypass_channel"

export interface guild_settings_data {
  welcome_channel?: string
  welcome_message?: string
  ticket_category?: string
  ticket_log_channel?: string
  mod_log_channel?: string
  member_log_channel?: string
  auto_role?: string
  verification_channel?: string
  rules_channel?: string
  announcements_channel?: string
  bypass_channel?: string
}

/**
 * @param {string} guild_id - Guild ID
 * @param {guild_setting_key} key - Setting key to get
 * @returns {Promise<string | null>} Setting value or null
 */
export async function get_guild_setting(
  guild_id: string,
  key: guild_setting_key
): Promise<string | null> {
  try {
    if (!db.is_connected()) {
      throw new Error("Database not connected")
    }

    const cache_key = get_guild_cache_key(guild_id)
    const cached = cache.get<{ guild_id: string; settings: guild_settings_data }>(cache_key)

    if (cached) {
      return cached.settings[key] || null
    }

    const result = await db.find_one<{ guild_id: string; settings: guild_settings_data }>(
      "guild_settings",
      { guild_id }
    )

    if (result) {
      cache.set(cache_key, result, GUILD_SETTINGS_TTL)
    }

    if (!result || !result.settings) {
      return null
    }

    return result.settings[key] || null
  } catch (err) {
    console.error(`[ - GUILD SETTINGS ERROR - ] GET_GUILD_SETTING: ${(err as Error).message}`, { guild_id, key })
    return null
  }
}

/**
 * @param {string} guild_id - Guild ID
 * @returns {Promise<guild_settings_data | null>} All guild settings or null
 */
export async function get_all_guild_settings(
  guild_id: string
): Promise<guild_settings_data | null> {
  try {
    if (!db.is_connected()) {
      throw new Error("Database not connected")
    }

    const cache_key = get_guild_cache_key(guild_id)
    const cached = cache.get<{ guild_id: string; settings: guild_settings_data }>(cache_key)

    if (cached) {
      return cached.settings
    }

    const result = await db.find_one<{ guild_id: string; settings: guild_settings_data }>(
      "guild_settings",
      { guild_id }
    )

    if (result) {
      cache.set(cache_key, result, GUILD_SETTINGS_TTL)
    }

    return result?.settings || null
  } catch (err) {
    console.error(`[ - GUILD SETTINGS ERROR - ] GET_ALL_GUILD_SETTINGS: ${(err as Error).message}`, { guild_id })
    return null
  }
}

/**
 * @param {string} guild_id - Guild ID
 * @param {guild_setting_key} key - Setting key to set
 * @param {string} value - Setting value
 * @returns {Promise<boolean>} Success status
 */
export async function set_guild_setting(
  guild_id: string,
  key: guild_setting_key,
  value: string
): Promise<boolean> {
  try {
    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Setting ${key} = ${value} for guild ${guild_id}`)
    }

    if (!db.is_connected()) {
      console.error("[ - GUILD SETTINGS ERROR - ] Database not connected")
      throw new Error("Database not connected")
    }

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Fetching existing settings...`)
    }
    const existing = await db.find_one<{ guild_id: string; settings: guild_settings_data }>(
      "guild_settings",
      { guild_id }
    )

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Existing settings:`, existing)
    }

    const updated_settings: guild_settings_data = {
      ...(existing?.settings || {}),
      [key]: value,
    }

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Updated settings:`, updated_settings)
    }

    if (existing) {
      if (!is_production) {
        console.log(`[ - GUILD SETTINGS - ] Updating existing record...`)
      }
      await db.update_one(
        "guild_settings",
        { guild_id },
        { settings: updated_settings, updated_at: new Date() }
      )
    } else {
      if (!is_production) {
        console.log(`[ - GUILD SETTINGS - ] Inserting new record...`)
      }
      await db.insert_one("guild_settings", {
        guild_id,
        settings: updated_settings,
      })
    }

    invalidate_guild_cache(guild_id)

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Successfully set ${key} for guild ${guild_id}`)
    }
    return true
  } catch (err) {
    console.error(`[ - GUILD SETTINGS ERROR - ] SET_GUILD_SETTING: ${(err as Error).message}`)
    console.error(`[ - GUILD SETTINGS ERROR - ] Stack:`, (err as Error).stack)
    console.error(`[ - GUILD SETTINGS ERROR - ] Details:`, { guild_id, key, value })
    return false
  }
}

/**
 * @param {string} guild_id - Guild ID
 * @param {guild_setting_key} key - Setting key to remove
 * @returns {Promise<boolean>} Success status
 */
export async function remove_guild_setting(
  guild_id: string,
  key: guild_setting_key
): Promise<boolean> {
  try {
    if (!db.is_connected()) {
      throw new Error("Database not connected")
    }

    const existing = await db.find_one<{ guild_id: string; settings: guild_settings_data }>(
      "guild_settings",
      { guild_id }
    )

    if (!existing) {
      return false
    }

    const updated_settings = { ...existing.settings }
    delete updated_settings[key]

    await db.update_one(
      "guild_settings",
      { guild_id },
      { settings: updated_settings, updated_at: new Date() }
    )

    invalidate_guild_cache(guild_id)

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Removed ${key} for guild ${guild_id}`)
    }
    return true
  } catch (err) {
    console.error(`[ - GUILD SETTINGS ERROR - ] REMOVE_GUILD_SETTING: ${(err as Error).message}`, { guild_id, key })
    return false
  }
}

/**
 * @param {string} guild_id - Guild ID
 * @returns {Promise<boolean>} Success status
 */
export async function clear_all_guild_settings(guild_id: string): Promise<boolean> {
  try {
    if (!db.is_connected()) {
      throw new Error("Database not connected")
    }

    const deleted = await db.delete_one("guild_settings", { guild_id })

    if (deleted) {
      invalidate_guild_cache(guild_id)
    }

    if (!is_production) {
      console.log(`[ - GUILD SETTINGS - ] Cleared all settings for guild ${guild_id}`)
    }
    return deleted
  } catch (err) {
    console.error(`[ - GUILD SETTINGS ERROR - ] CLEAR_ALL_GUILD_SETTINGS: ${(err as Error).message}`, { guild_id })
    return false
  }
}
