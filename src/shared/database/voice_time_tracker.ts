import { db } from "../utils"

interface voice_channel_record {
  channel_id     : string
  owner_id       : string
  guild_id       : string
  created_at     : Date
  deleted_at     : Date | null
  duration_seconds: number
}

const COLLECTION = "voice_channel_time"

export async function track_channel_created(channel_id: string, owner_id: string, guild_id: string): Promise<void> {
  await db.insert_one<voice_channel_record>(
    COLLECTION,
    {
      channel_id,
      owner_id,
      guild_id,
      created_at      : new Date(),
      deleted_at      : null,
      duration_seconds: 0,
    }
  )
}

export async function track_channel_deleted(channel_id: string): Promise<void> {
  const record = await db.find_one<voice_channel_record>(
    COLLECTION,
    { channel_id, deleted_at: null }
  )

  if (!record) return

  const duration = Math.floor((Date.now() - new Date(record.created_at).getTime()) / 1000)

  await db.update_one<voice_channel_record>(
    COLLECTION,
    { channel_id, deleted_at: null },
    {
      deleted_at      : new Date(),
      duration_seconds: duration,
    }
  )
}

export async function get_channel_leaderboard(guild_id: string, limit: number = 10): Promise<voice_channel_record[]> {
  const records = await db.find_many<voice_channel_record>(
    COLLECTION,
    { guild_id }
  )

  const active_records = records.map(record => {
    if (!record.deleted_at) {
      const current_duration = Math.floor((Date.now() - new Date(record.created_at).getTime()) / 1000)
      return {
        ...record,
        duration_seconds: current_duration,
      }
    }
    return record
  })

  return active_records
    .sort((a, b) => b.duration_seconds - a.duration_seconds)
    .slice(0, limit)
}

export function format_time(seconds: number): string {
  const days    = Math.floor(seconds / 86400)
  const hours   = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs    = seconds % 60

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(" ")
}
