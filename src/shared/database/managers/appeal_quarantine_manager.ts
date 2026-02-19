import { db } from "../../utils"

const __collection = "appeal_quarantine_usage"

interface appeal_usage_record {
  user_id    : string
  guild_id   : string
  used_at    : number
  thread_id? : string
}

/**
 * @description Check if user has already used their appeal quarantine ticket
 * @param user_id  - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<boolean>
 */
export async function has_used_appeal(user_id: string, guild_id: string): Promise<boolean> {
  const record = await db.find_one<appeal_usage_record>(__collection, { user_id, guild_id })
  return record !== null
}

/**
 * @description Mark user as having used their appeal quarantine ticket
 * @param user_id   - Discord user ID
 * @param guild_id  - Discord guild ID
 * @param thread_id - Created thread ID
 * @returns Promise<void>
 */
export async function mark_appeal_used(user_id: string, guild_id: string, thread_id: string): Promise<void> {
  await db.insert_one<appeal_usage_record>(__collection, {
    user_id,
    guild_id,
    used_at   : Math.floor(Date.now() / 1000),
    thread_id,
  })
}

/**
 * @description Reset a user's appeal usage (e.g. staff grants another chance)
 * @param user_id  - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<void>
 */
export async function reset_appeal_usage(user_id: string, guild_id: string): Promise<void> {
  await db.delete_one(__collection, { user_id, guild_id })
}
