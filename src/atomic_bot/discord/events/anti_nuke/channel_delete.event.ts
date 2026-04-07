/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke: channel delete event listener - \\
import { Events, GuildChannel, AuditLogEvent, ChannelType } from "discord.js"
import { log_error }                                          from "@utils/error_logger"
import { client }                                             from "@startup/atomic_bot"
import { fetch_audit_executor, should_skip, process_nuke_event } from "./shared"
import { anti_nuke_channel_snapshot }                             from "@models/anti_nuke.model"

client.on(Events.ChannelDelete, async (channel) => {
  if (!("guild" in channel) || !channel.guild) return

  const guild = channel.guild
  const ch    = channel as GuildChannel

  try {
    const executor_id = await fetch_audit_executor(guild, AuditLogEvent.ChannelDelete, ch.id)
    if (!executor_id) return

    if (await should_skip(guild, executor_id)) return

    // - capture deleted channel data before processing for potential restore - \\
    const snapshot: Omit<anti_nuke_channel_snapshot, "incident_id" | "guild_id"> = {
      channel_id  : ch.id,
      channel_name: ch.name,
      channel_type: ch.type,
      position    : ch.rawPosition,
      parent_id   : ch.parentId,
      topic       : ("topic" in ch ? ch.topic : null) as string | null,
      nsfw        : ("nsfw" in ch ? ch.nsfw : false) as boolean,
      captured_at : Math.floor(Date.now() / 1000),
    }

    await process_nuke_event(guild, executor_id, "channel_delete", [snapshot as any], [])
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Channel Delete", { guild_id: guild.id }).catch(() => {})
  }
})
