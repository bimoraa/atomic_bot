/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke: guild member remove event listener — only counts kicks, not voluntary leaves - \\
import { Events, GuildMember, PartialGuildMember, AuditLogEvent } from "discord.js"
import { log_error }                                               from "@utils/error_logger"
import { client }                                                  from "@startup/atomic_bot"
import { fetch_audit_executor, should_skip, process_nuke_event }   from "./shared"

client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
  const guild = member.guild

  try {
    // - only score if a KICK audit log entry exists for this user with a recent timestamp - \\
    const executor_id = await fetch_audit_executor(guild, AuditLogEvent.MemberKick, member.id)
    if (!executor_id) return

    if (await should_skip(guild, executor_id)) return

    await process_nuke_event(guild, executor_id, "member_kick", [], [])
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Member Remove", { guild_id: guild.id }).catch(() => {})
  }
})
