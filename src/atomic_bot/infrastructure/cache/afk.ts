import { db } from "@shared/utils"

interface AfkData {
  user_id           : string
  reason            : string
  timestamp         : number
  original_nickname : string | null
}

interface afk_ignored_channel {
  guild_id   : string
  channel_id : string
  added_by   : string
  added_at   : number
}

const afk_users = new Map<string, AfkData>()
const ignored_channels = new Map<string, Set<string>>()
const COLLECTION = "afk_users"
const IGNORED_COLLECTION = "afk_ignored_channels"

export async function load_afk_from_db(): Promise<void> {
  try {
    const records = await db.find_many<AfkData>(COLLECTION, {})
    for (const record of records) {
      afk_users.set(record.user_id, record)
    }
    console.log(`[ - AFK - ] Loaded ${records.length} AFK users from database`)
  } catch (error) {
    console.error("[ - AFK - ] Failed to load AFK users:", error)
  }
}

/**
 * - LOAD AFK IGNORED CHANNELS FROM DB - \\
 * @returns {Promise<void>}
 */
export async function load_afk_ignored_channels_from_db(): Promise<void> {
  try {
    const records = await db.find_many<afk_ignored_channel>(IGNORED_COLLECTION, {})
    for (const record of records) {
      const existing = ignored_channels.get(record.guild_id) || new Set<string>()
      existing.add(record.channel_id)
      ignored_channels.set(record.guild_id, existing)
    }
    console.log(`[ - AFK - ] Loaded ${records.length} AFK ignored channels from database`)
  } catch (error) {
    console.error("[ - AFK - ] Failed to load AFK ignored channels:", error)
  }
}

export async function set_afk(user_id: string, reason: string, original_nickname: string | null): Promise<void> {
  const afk_data: AfkData = {
    user_id,
    reason,
    timestamp         : Date.now(),
    original_nickname,
  }
  
  afk_users.set(user_id, afk_data)
  
  try {
    await db.update_one<AfkData>(
      COLLECTION,
      { user_id },
      afk_data,
      true
    )
  } catch (error) {
    console.error("[ - AFK - ] Failed to save AFK to database:", error)
  }
}

/**
 * - UPDATE AFK REASON - \\
 * @param {string} user_id - Discord user ID
 * @param {string} reason - New AFK reason
 * @returns {Promise<boolean>} True if updated
 */
export async function update_afk_reason(user_id: string, reason: string): Promise<boolean> {
  const data = afk_users.get(user_id)
  if (!data) return false

  const updated: AfkData = {
    ...data,
    reason: reason,
  }

  afk_users.set(user_id, updated)

  try {
    await db.update_one<AfkData>(
      COLLECTION,
      { user_id },
      { reason: reason }
    )
  } catch (error) {
    console.error("[ - AFK - ] Failed to update AFK reason:", error)
  }

  return true
}

export async function remove_afk(user_id: string): Promise<AfkData | null> {
  const data = afk_users.get(user_id)
  if (data) {
    afk_users.delete(user_id)
    
    try {
      await db.delete_one(COLLECTION, { user_id })
    } catch (error) {
      console.error("[ - AFK - ] Failed to delete AFK from database:", error)
    }
    
    return data
  }
  return null
}

/**
 * - GET ALL AFK USERS - \\
 * @returns {AfkData[]} AFK data list
 */
export function get_all_afk(): AfkData[] {
  return Array.from(afk_users.values())
}

export function get_afk(user_id: string): AfkData | null {
  return afk_users.get(user_id) || null
}

export function is_afk(user_id: string): boolean {
  return afk_users.has(user_id)
}

/**
 * - CHECK IGNORED CHANNEL - \\
 * @param {string} guild_id - Discord guild ID
 * @param {string} channel_id - Discord channel ID
 * @returns {boolean} True if ignored
 */
export function is_ignored_channel(guild_id: string, channel_id: string): boolean {
  const set = ignored_channels.get(guild_id)
  if (!set) return false
  return set.has(channel_id)
}

/**
 * - GET IGNORED CHANNELS - \\
 * @param {string} guild_id - Discord guild ID
 * @returns {string[]} Channel IDs
 */
export function get_ignored_channels(guild_id: string): string[] {
  const set = ignored_channels.get(guild_id)
  if (!set) return []
  return Array.from(set.values())
}

/**
 * - ADD IGNORED CHANNEL - \\
 * @param {string} guild_id - Discord guild ID
 * @param {string} channel_id - Discord channel ID
 * @param {string} added_by - Moderator ID
 * @returns {Promise<boolean>} True if added
 */
export async function add_ignored_channel(guild_id: string, channel_id: string, added_by: string): Promise<boolean> {
  const set = ignored_channels.get(guild_id) || new Set<string>()
  if (set.has(channel_id)) return false

  set.add(channel_id)
  ignored_channels.set(guild_id, set)

  try {
    await db.update_one<afk_ignored_channel>(
      IGNORED_COLLECTION,
      { guild_id, channel_id },
      {
        guild_id,
        channel_id,
        added_by,
        added_at: Date.now(),
      },
      true
    )
  } catch (error) {
    console.error("[ - AFK - ] Failed to add ignored channel:", error)
  }

  return true
}

/**
 * - REMOVE IGNORED CHANNEL - \\
 * @param {string} guild_id - Discord guild ID
 * @param {string} channel_id - Discord channel ID
 * @returns {Promise<boolean>} True if removed
 */
export async function remove_ignored_channel(guild_id: string, channel_id: string): Promise<boolean> {
  const set = ignored_channels.get(guild_id)
  if (!set || !set.has(channel_id)) return false

  set.delete(channel_id)
  if (set.size === 0) {
    ignored_channels.delete(guild_id)
  }

  try {
    await db.delete_one(IGNORED_COLLECTION, { guild_id, channel_id })
  } catch (error) {
    console.error("[ - AFK - ] Failed to remove ignored channel:", error)
  }

  return true
}
