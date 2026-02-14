import { db } from "../../utils"

const __collection = "quarantined_members"

interface quarantined_member {
  _id?         : any
  user_id      : string
  guild_id     : string
  quarantine_role_id: string
  previous_roles: string[]
  reason       : string
  quarantined_by: string
  quarantined_at: number
  release_at   : number
  created_at   : number
}

/**
 * @description Add member to quarantine list
 * @param user_id - Discord user ID
 * @param guild_id - Discord guild ID
 * @param quarantine_role_id - ID of the quarantine role
 * @param previous_roles - Array of previous role IDs
 * @param reason - Reason for quarantine
 * @param quarantined_by - ID of the executor
 * @param days - Number of days for quarantine
 * @returns Promise<void>
 */
export async function add_quarantine(
  user_id: string,
  guild_id: string,
  quarantine_role_id: string,
  previous_roles: string[],
  reason: string,
  quarantined_by: string,
  days: number
): Promise<void> {
  const now        = Math.floor(Date.now() / 1000)
  const release_at = now + (days * 24 * 60 * 60)

  await db.insert_one<quarantined_member>(__collection, {
    user_id,
    guild_id,
    quarantine_role_id,
    previous_roles,
    reason,
    quarantined_by,
    quarantined_at : now,
    release_at,
    created_at     : now,
  })
}

/**
 * @description Remove member from quarantine list
 * @param user_id - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<void>
 */
export async function remove_quarantine(user_id: string, guild_id: string): Promise<void> {
  await db.delete_one(__collection, { user_id, guild_id })
}

/**
 * @description Get quarantine data for a member
 * @param user_id - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise with quarantine data or null
 */
export async function get_quarantine(user_id: string, guild_id: string): Promise<quarantined_member | null> {
  return db.find_one<quarantined_member>(__collection, { user_id, guild_id })
}

/**
 * @description Check if member is quarantined
 * @param user_id - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<boolean>
 */
export async function is_quarantined(user_id: string, guild_id: string): Promise<boolean> {
  const quarantine = await get_quarantine(user_id, guild_id)
  return quarantine !== null
}

/**
 * @description Get all quarantined members for a guild
 * @param guild_id - Discord guild ID
 * @returns Promise with array of quarantined members
 */
export async function get_guild_quarantines(guild_id: string): Promise<quarantined_member[]> {
  return db.find_many<quarantined_member>(__collection, { guild_id })
}

/**
 * @description Get all members due for release
 * @returns Promise with array of quarantined members
 */
export async function get_expired_quarantines(): Promise<quarantined_member[]> {
  const now = Math.floor(Date.now() / 1000)
  return db.find_many<quarantined_member>(__collection, {})
    .then(quarantines => quarantines.filter(q => q.release_at <= now))
}

export type { quarantined_member }
