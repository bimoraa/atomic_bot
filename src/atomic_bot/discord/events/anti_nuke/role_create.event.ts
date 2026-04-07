/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke: role create event listener - \\
import { Events, Role, AuditLogEvent } from "discord.js"
import { log_error }                    from "@utils/error_logger"
import { client }                       from "@startup/atomic_bot"
import { fetch_audit_executor, should_skip, process_nuke_event } from "./shared"

client.on(Events.GuildRoleCreate, async (role: Role) => {
  if (!role.guild) return

  const guild = role.guild

  try {
    const executor_id = await fetch_audit_executor(guild, AuditLogEvent.RoleCreate, role.id)
    if (!executor_id) return

    if (await should_skip(guild, executor_id)) return

    await process_nuke_event(guild, executor_id, "role_create", [], [])
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Role Create", { guild_id: guild.id }).catch(() => {})
  }
})
