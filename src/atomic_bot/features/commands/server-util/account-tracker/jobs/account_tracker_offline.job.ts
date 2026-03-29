/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 定时检查并自动标记长时间未上报的账户为离线 - \\
// - scheduler that auto-flags stale sessions as offline when no post arrives - \\
import { Client, TextChannel }   from "discord.js"
import { log_error }             from "@shared/utils/error_logger"
import {
  get_all_sessions,
  get_all_sessions_global,
  upsert_session,
  get_tracker_config,
}                                from "@shared/database/managers/account_tracker.manager"
import { build_overview_message } from "@atomic/http/routes/account_tracker.api"

// - 5 分钟无上报视为离线 - \\
// - if no post arrives within 5 min, the session is considered offline - \\
const __offline_threshold = 5 * 60 * 1000

// - 每 2 分钟检查一次 - \\
// - check interval: every 2 minutes - \\
const __check_interval    = 2 * 60 * 1000

/**
 * @description start background job that flags stale sessions as "Offline"
 * @param client - Discord Client instance
 * @returns void
 */
export function start_account_tracker_offline_checker(client: Client): void {
  console.log("[ - ACCOUNT TRACKER - ] offline checker started")

  setInterval(async () => {
    try {
      const all_sessions = await get_all_sessions_global()

      // - 按 guild_id 分组，方便逐 guild 更新消息 - \\
      // - group sessions by guild_id to update the message per guild - \\
      const guild_map = new Map<string, string[]>()

      for (const session of all_sessions) {
        if (!guild_map.has(session.guild_id)) {
          guild_map.set(session.guild_id, [])
        }
        guild_map.get(session.guild_id)!.push(session.key_hash)
      }

      const now = Date.now()

      for (const session of all_sessions) {
        const is_stale   = (now - session.updated_at) > __offline_threshold
        const is_offline = session.status === "Offline"

        if (!is_stale || is_offline) continue

        // - 将超时的 session 标记为 Offline - \\
        // - mark stale session as offline - \\
        await upsert_session({ ...session, status: "Offline" })
      }

      // - 为每个 guild 更新 Discord overview 消息 - \\
      // - update the discord overview message for each guild - \\
      for (const [guild_id] of guild_map) {
        try {
          const config = await get_tracker_config(guild_id)
          if (!config?.channel_id || !config?.message_id) continue

          const guild = await client.guilds.fetch(guild_id).catch(() => null)
          if (!guild) continue

          const channel = await guild.channels.fetch(config.channel_id).catch(() => null)
          if (!channel || !(channel instanceof TextChannel)) continue

          const message = await channel.messages.fetch(config.message_id).catch(() => null)
          if (!message) continue

          const updated_sessions = await get_all_sessions(guild_id)
          await message.edit(build_overview_message(updated_sessions, guild_id))
        } catch (err) {
          await log_error(client, err as Error, "Account Tracker Offline Checker — Guild Update", {
            guild_id,
          }).catch(() => {})
        }
      }
    } catch (err) {
      await log_error(client, err as Error, "Account Tracker Offline Checker").catch(() => {})
    }
  }, __check_interval)
}
