/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client } from "discord.js"
import { db, logger } from "@shared/utils"
import * as time from "@shared/utils/timestamp"

// - 内存中的活跃会话存储："guild_id:user_id" -> 会话 - \\
// - in-memory active session store: "guild_id:user_id" -> session - \\
interface active_session {
  guild_id   : string
  channel_id : string
  joined_at  : number    // unix seconds
}

const log             = logger.create_logger("staff_voice")
const active_sessions = new Map<string, active_session>()

/**
 * Returns the composite session key for a user in a guild.
 * @param guild_id Guild ID
 * @param user_id  User ID
 * @returns string key
 */
function session_key(guild_id: string, user_id: string): string {
  return `${guild_id}:${user_id}`
}

/**
 * Called when a user joins a voice channel.
 * If they already have an active session (channel switch), just update the channel_id.
 * @param user_id    User ID
 * @param guild_id   Guild ID
 * @param channel_id Voice channel ID they joined
 */
export function on_voice_join(user_id: string, guild_id: string, channel_id: string): void {
  const key = session_key(guild_id, user_id)

  if (active_sessions.has(key)) {
    // - 频道切换：更新频道但保持会话进行 - \\
    // - channel switch: update channel but keep session running - \\
    active_sessions.get(key)!.channel_id = channel_id
    return
  }

  active_sessions.set(key, {
    guild_id,
    channel_id,
    joined_at: time.now(),
  })

  console.log(`[ - STAFF VOICE - ] ${user_id} joined #${channel_id} in ${guild_id}`)
}

/**
 * Called when a user leaves voice (disconnect, not channel switch).
 * Computes duration and saves a session record to DB.
 * @param user_id  User ID
 * @param guild_id Guild ID
 */
export async function on_voice_leave(user_id: string, guild_id: string): Promise<void> {
  const key     = session_key(guild_id, user_id)
  const session = active_sessions.get(key)

  if (!session) return

  active_sessions.delete(key)

  const left_at          = time.now()
  const duration_seconds = Math.max(0, left_at - session.joined_at)

  // - 忽略不足 10 秒的短暂连接 - \\
  // - ignore blips under 10 seconds - \\
  if (duration_seconds < 10) return

  try {
    const pool = db.get_pool()
    await pool.query(`
      INSERT INTO staff_voice_sessions
        (user_id, guild_id, channel_id, joined_at, left_at, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [user_id, guild_id, session.channel_id, session.joined_at, left_at, duration_seconds])

    console.log(`[ - STAFF VOICE - ] ${user_id} left voice: ${duration_seconds}s recorded`)
  } catch (err) {
    log.error(`Failed to save voice session for ${user_id}: ${(err as Error).message}`)
  }
}

/**
 * Scans all guilds' voice channels on bot startup and resumes tracking for any
 * users already in voice (handles bot restarts without losing session start time).
 * Uses a synthetic join_at of NOW() — their pre-restart time is unrecoverable.
 * @param client Discord client (must be ready)
 */
export async function recover_active_sessions(client: Client): Promise<void> {
  let recovered = 0

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!("members" in channel)) continue

      for (const [, member] of (channel as import("discord.js").VoiceChannel).members) {
        if (member.user.bot) continue
        on_voice_join(member.id, guild.id, channel.id)
        recovered++
      }
    }
  }

  console.log(`[ - STAFF VOICE - ] Recovered ${recovered} active voice sessions on startup`)
}

/**
 * Queries total voice time per user for sessions that started within [from_ts_ms, to_ts_ms].
 * @param from_ts_ms start unix milliseconds
 * @param to_ts_ms   end unix milliseconds
 * @returns Map of user_id -> total voice seconds in range
 */
export async function count_voice_time(
  from_ts_ms : number,
  to_ts_ms   : number
): Promise<Map<string, number>> {
  const result_map = new Map<string, number>()
  if (!db.is_connected()) return result_map

  const from_sec = Math.floor(from_ts_ms / 1000)
  const to_sec   = Math.floor(to_ts_ms   / 1000)

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{ user_id: string; total_seconds: string }>(`
      SELECT user_id, SUM(duration_seconds) AS total_seconds
      FROM staff_voice_sessions
      WHERE joined_at >= $1
        AND joined_at <= $2
        AND left_at   IS NOT NULL
      GROUP BY user_id
    `, [from_sec, to_sec])

    for (const row of result.rows) {
      result_map.set(row.user_id, Number(row.total_seconds))
    }
  } catch (err) {
    log.error(`Failed to count voice time: ${(err as Error).message}`)
  }

  return result_map
}
