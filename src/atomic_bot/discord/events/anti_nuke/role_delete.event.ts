/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke: role delete event listener - \\
import { Events, Role, AuditLogEvent } from "discord.js"
import { log_error }                    from "@utils/error_logger"
import { client }                       from "@startup/atomic_bot"
import { fetch_audit_executor, should_skip, process_nuke_event } from "./shared"
import { anti_nuke_role_snapshot }      from "@models/anti_nuke.model"

client.on(Events.GuildRoleDelete, async (role: Role) => {
  if (!role.guild) return

  const guild = role.guild

  try {
    const executor_id = await fetch_audit_executor(guild, AuditLogEvent.RoleDelete, role.id)
    if (!executor_id) return

    if (await should_skip(guild, executor_id)) return

    // - capture deleted role data before processing for potential restore - \\
    const snapshot: Omit<anti_nuke_role_snapshot, "incident_id" | "guild_id"> = {
      role_id       : role.id,
      role_name     : role.name,
      position      : role.rawPosition,
      color         : role.color,
      permissions_bf: role.permissions.bitfield.toString(),
      hoist         : role.hoist,
      mentionable   : role.mentionable,
      captured_at   : Math.floor(Date.now() / 1000),
    }

    await process_nuke_event(guild, executor_id, "role_delete", [], [snapshot as any])
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Role Delete", { guild_id: guild.id }).catch(() => {})
  }
})
