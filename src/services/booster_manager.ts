import { db } from "../utils"

interface booster_whitelist {
  user_id      : string
  guild_id     : string
  whitelisted_at: Date
  boost_count  : number
}

const COLLECTION = "booster_whitelist"

export async function add_whitelist(user_id: string, guild_id: string, boost_count: number): Promise<void> {
  await db.update_one<booster_whitelist>(
    COLLECTION,
    { user_id, guild_id },
    {
      user_id,
      guild_id,
      whitelisted_at: new Date(),
      boost_count,
    },
    true
  )
}

export async function remove_whitelist(user_id: string, guild_id: string): Promise<void> {
  await db.delete_one(COLLECTION, { user_id, guild_id })
}

export async function is_whitelisted(user_id: string, guild_id: string): Promise<boolean> {
  const record = await db.find_one<booster_whitelist>(
    COLLECTION,
    { user_id, guild_id }
  )
  return record !== null
}

export async function get_whitelist(user_id: string, guild_id: string): Promise<booster_whitelist | null> {
  return db.find_one<booster_whitelist>(COLLECTION, { user_id, guild_id })
}

export async function update_boost_count(user_id: string, guild_id: string, boost_count: number): Promise<void> {
  await db.update_one<booster_whitelist>(
    COLLECTION,
    { user_id, guild_id },
    { boost_count }
  )
}
