/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke: webhook update event listener — detects new webhook creation - \\
import { Events, TextChannel, AuditLogEvent, GuildChannel } from "discord.js"
import { log_error }                                          from "@utils/error_logger"
import { client }                                             from "@startup/atomic_bot"
import { fetch_audit_executor, should_skip, process_nuke_event } from "./shared"

client.on(Events.WebhooksUpdate, async (channel: TextChannel | GuildChannel) => {
  if (!("guild" in channel) || !channel.guild) return

  const guild = channel.guild

  try {
    // - only count webhook creation (not update/delete) to avoid false positives - \\
    const executor_id = await fetch_audit_executor(guild, AuditLogEvent.WebhookCreate)
    if (!executor_id) return

    if (await should_skip(guild, executor_id)) return

    await process_nuke_event(guild, executor_id, "webhook_update", [], [])
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Webhook Update", { guild_id: guild.id }).catch(() => {})
  }
})
