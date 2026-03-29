/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - account tracker 数据库管理器 - \\
// - account tracker database manager - \\
import { db }                     from "@shared/utils"
import type {
  account_tracker_config,
  account_tracker_session,
}                                 from "@models/account_tracker.model"

const __config_col   = "account_tracker_configs"
const __sessions_col = "account_tracker_sessions"

// - ─── tracker config ─── - \\

/**
 * @description get tracker config for a guild
 * @param guild_id - guild ID
 * @returns account_tracker_config or null
 */
export async function get_tracker_config(guild_id: string): Promise<account_tracker_config | null> {
  return db.find_one<account_tracker_config>(__config_col, { guild_id })
}

/**
 * @description upsert tracker config (create or update channel + message)
 * @param config - account_tracker_config object
 * @returns void
 */
export async function upsert_tracker_config(config: account_tracker_config): Promise<void> {
  const existing = await db.find_one<account_tracker_config>(__config_col, { guild_id: config.guild_id })

  if (existing) {
    await db.update_one(__config_col, { guild_id: config.guild_id }, {
      $set: {
        channel_id : config.channel_id,
        message_id : config.message_id,
      },
    })
  } else {
    await db.insert_one(__config_col, config)
  }
}

// - ─── tracker sessions ─── - \\

/**
 * @description get all active account sessions for a guild
 * @param guild_id - guild ID
 * @returns list of account_tracker_session
 */
export async function get_all_sessions(guild_id: string): Promise<account_tracker_session[]> {
  return db.find_many<account_tracker_session>(__sessions_col, { guild_id })
}

/**
 * @description get a single session by key_hash
 * @param guild_id - guild ID
 * @param key_hash - hashed script key (first 16 hex chars of sha256)
 * @returns account_tracker_session or null
 */
export async function get_session_by_hash(guild_id: string, key_hash: string): Promise<account_tracker_session | null> {
  return db.find_one<account_tracker_session>(__sessions_col, { guild_id, key_hash })
}

/**
 * @description upsert (create or update) an account tracker session
 * @param session - account_tracker_session object
 * @returns void
 */
export async function upsert_session(session: account_tracker_session): Promise<void> {
  const existing = await db.find_one<account_tracker_session>(__sessions_col, {
    guild_id : session.guild_id,
    key_hash : session.key_hash,
  })

  if (existing) {
    await db.update_one(__sessions_col, { guild_id: session.guild_id, key_hash: session.key_hash }, {
      $set: {
        username        : session.username,
        user_id         : session.user_id,
        server_code     : session.server_code,
        status          : session.status,
        elapsed_time    : session.elapsed_time,
        current_money   : session.current_money,
        money_received  : session.money_received,
        total_earnings  : session.total_earnings,
        average_earn    : session.average_earn,
        estimated_done  : session.estimated_done,
        teleport_needed : session.teleport_needed,
        updated_at      : session.updated_at,
      },
    })
  } else {
    await db.insert_one(__sessions_col, session)
  }
}

/**
 * @description delete a single account session by key_hash
 * @param guild_id - guild ID
 * @param key_hash - hashed script key
 * @returns void
 */
export async function delete_session_by_hash(guild_id: string, key_hash: string): Promise<void> {
  await db.delete_one(__sessions_col, { guild_id, key_hash })
}
