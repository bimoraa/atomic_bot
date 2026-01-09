import { db } from "../utils"

interface reputation_record {
  user_id       : string
  guild_id      : string
  total_rep     : number
  given_rep     : number
  last_given_at : Date | null
}

interface reputation_log {
  from_user_id : string
  to_user_id   : string
  guild_id     : string
  note         : string
  timestamp    : Date
}

const COLLECTION_REPUTATION = "reputation"
const COLLECTION_REP_LOG    = "reputation_log"

const COOLDOWN_HOURS = 24

export async function can_give_rep(user_id: string, guild_id: string): Promise<boolean> {
  const record = await db.find_one<reputation_record>(
    COLLECTION_REPUTATION,
    { user_id, guild_id }
  )

  if (!record || !record.last_given_at) return true

  const now            = new Date()
  const last_given     = new Date(record.last_given_at)
  const hours_since    = (now.getTime() - last_given.getTime()) / (1000 * 60 * 60)

  return hours_since >= COOLDOWN_HOURS
}

export async function get_cooldown_remaining(user_id: string, guild_id: string): Promise<number> {
  const record = await db.find_one<reputation_record>(
    COLLECTION_REPUTATION,
    { user_id, guild_id }
  )

  if (!record || !record.last_given_at) return 0

  const now         = new Date()
  const last_given  = new Date(record.last_given_at)
  const hours_since = (now.getTime() - last_given.getTime()) / (1000 * 60 * 60)
  const remaining   = COOLDOWN_HOURS - hours_since

  return remaining > 0 ? Math.ceil(remaining) : 0
}

export async function give_reputation(
  from_user_id : string,
  to_user_id   : string,
  guild_id     : string,
  note         : string
): Promise<boolean> {
  try {
    const to_user = await db.find_one<reputation_record>(
      COLLECTION_REPUTATION,
      { user_id: to_user_id, guild_id }
    )

    await db.update_one<reputation_record>(
      COLLECTION_REPUTATION,
      { user_id: to_user_id, guild_id },
      {
        user_id      : to_user_id,
        guild_id,
        total_rep    : (to_user?.total_rep || 0) + 1,
        given_rep    : to_user?.given_rep || 0,
        last_given_at: to_user?.last_given_at || null,
      },
      true
    )

    const from_user = await db.find_one<reputation_record>(
      COLLECTION_REPUTATION,
      { user_id: from_user_id, guild_id }
    )

    await db.update_one<reputation_record>(
      COLLECTION_REPUTATION,
      { user_id: from_user_id, guild_id },
      {
        user_id      : from_user_id,
        guild_id,
        total_rep    : from_user?.total_rep || 0,
        given_rep    : (from_user?.given_rep || 0) + 1,
        last_given_at: new Date(),
      },
      true
    )

    await db.insert_one<reputation_log>(
      COLLECTION_REP_LOG,
      {
        from_user_id,
        to_user_id,
        guild_id,
        note,
        timestamp: new Date(),
      }
    )

    return true
  } catch {
    return false
  }
}

export async function get_reputation(user_id: string, guild_id: string): Promise<reputation_record | null> {
  return db.find_one<reputation_record>(
    COLLECTION_REPUTATION,
    { user_id, guild_id }
  )
}

export async function get_leaderboard(guild_id: string, limit: number = 10): Promise<reputation_record[]> {
  const records = await db.find_many<reputation_record>(
    COLLECTION_REPUTATION,
    { guild_id }
  )

  return records
    .sort((a, b) => b.total_rep - a.total_rep)
    .slice(0, limit)
}

export async function get_reputation_logs(user_id: string, guild_id: string, limit: number = 5): Promise<reputation_log[]> {
  const logs = await db.find_many<reputation_log>(
    COLLECTION_REP_LOG,
    { to_user_id: user_id, guild_id }
  )

  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
