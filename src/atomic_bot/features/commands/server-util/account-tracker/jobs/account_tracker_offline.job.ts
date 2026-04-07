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
import { log_error }             from "@utils/error_logger"
import {
  get_all_sessions,
  get_all_sessions_global,
  upsert_session,
  get_tracker_config,
}                                from "@managers/account_tracker.manager"
import { build_overview_message } from "@http/routes/account_tracker.api"

// - 全局固定键，sessions 不区分 guild - \\
// - fixed global key, sessions are not scoped per guild - \\
const __global_key        = "global"

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
      const now          = Date.now()

      for (const session of all_sessions) {
        const is_stale   = (now - session.updated_at) > __offline_threshold
        const is_offline = session.status === "Offline"

        if (!is_stale || is_offline) continue

        // - 将超时的 session 标记为 Offline - \\
        // - mark stale session as offline - \\
        await upsert_session({ ...session, status: "Offline" })
      }

      // - 更新全局 tracker overview 消息 - \\
      // - update global tracker overview message - \\
      try {
        const config = await get_tracker_config(__global_key)
        if (!config?.channel_id || !config?.message_id || !config?.guild_id) return

        const guild = await client.guilds.fetch(config.guild_id).catch(() => null)
        if (!guild) return

        const channel = await guild.channels.fetch(config.channel_id).catch(() => null)
        if (!channel || !(channel instanceof TextChannel)) return

        const message = await channel.messages.fetch(config.message_id).catch(() => null)
        if (!message) return

        const updated_sessions = await get_all_sessions(__global_key)
        await message.edit(build_overview_message(updated_sessions, __global_key))
      } catch (err) {
        await log_error(client, err as Error, "Account Tracker Offline Checker — Overview Update").catch(() => {})
      }
    } catch (err) {
      await log_error(client, err as Error, "Account Tracker Offline Checker").catch(() => {})
    }
  }, __check_interval)
}
