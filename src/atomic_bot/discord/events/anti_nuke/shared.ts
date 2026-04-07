/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - shared utilities for all anti-nuke event listeners - \\
import { Guild, GuildMember, AuditLogEvent } from "discord.js"
import { randomUUID }                         from "crypto"
import {
  is_whitelisted,
  is_maintenance_active,
  get_config,
  save_channel_snapshot,
  save_role_snapshot,
}                                             from "@managers/anti_nuke_manager"
import {
  track_event,
  get_context_bias,
  is_already_quarantined,
  mark_quarantined,
}                                             from "@integrations/cache/anti_nuke_tracker"
import {
  execute_quarantine,
  send_soft_alert,
}                                             from "@commands/moderation/anti-nuke/controller/anti_nuke.controller"
import {
  anti_nuke_event_type,
  anti_nuke_channel_snapshot,
  anti_nuke_role_snapshot,
}                                             from "@models/anti_nuke.model"
import { save_incident }                      from "@managers/anti_nuke_manager"

// - audit log fetch delay in ms — gives Discord time to write the entry - \\
const __audit_log_delay_ms = 600

/**
 * @description sleep for a given number of milliseconds
 * @param ms - milliseconds to wait
 * @returns Promise<void>
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * @description fetch the executor user ID from the audit log for a given action
 * @param guild      - Discord Guild
 * @param action     - AuditLogEvent type to look up
 * @param target_id  - optional target user/object ID to match
 * @returns executor user ID or null if not found
 */
export async function fetch_audit_executor(
  guild     : Guild,
  action    : AuditLogEvent,
  target_id?: string,
): Promise<string | null> {
  try {
    await sleep(__audit_log_delay_ms)

    const logs = await guild.fetchAuditLogs({ limit: 5, type: action }).catch(() => null)
    if (!logs) return null

    const cutoff = Date.now() - 10_000

    for (const entry of logs.entries.values()) {
      if (entry.createdTimestamp < cutoff) continue
      if (target_id && entry.targetId !== target_id) continue

      return entry.executor?.id ?? null
    }

    return null
  } catch {
    return null
  }
}

/**
 * @description check all skip conditions for an executor before scoring
 * @param guild       - Discord Guild
 * @param executor_id - user ID of the executor
 * @returns true if the event should be ignored
 */
export async function should_skip(guild: Guild, executor_id: string): Promise<boolean> {
  if (!executor_id) return true

  // - skip bots including this bot - \\
  try {
    const user = await guild.client.users.fetch(executor_id)
    if (user.bot) return true
  } catch {
    return true
  }

  // - skip guild owner - \\
  if (guild.ownerId === executor_id) return true

  // - skip whitelisted users - \\
  if (await is_whitelisted(executor_id, guild.id)) return true

  // - skip if maintenance mode active - \\
  if (await is_maintenance_active(guild.id)) return true

  // - skip if anti-nuke is disabled for this guild - \\
  const config = await get_config(guild.id)
  if (!config.enabled) return true

  return false
}

/**
 * @description process a nuke event: score the executor and take appropriate action
 * @param guild             - Discord Guild
 * @param executor_id       - user ID of the executor
 * @param event_type        - type of nuke event
 * @param channel_snapshots - channel data captured at event time (for channel_delete)
 * @param role_snapshots    - role data captured at event time (for role_delete)
 * @returns Promise<void>
 */
export async function process_nuke_event(
  guild            : Guild,
  executor_id      : string,
  event_type       : anti_nuke_event_type,
  channel_snapshots: anti_nuke_channel_snapshot[] = [],
  role_snapshots   : anti_nuke_role_snapshot[]   = [],
): Promise<void> {
  if (is_already_quarantined(guild.id, executor_id)) return

  const member = await guild.members.fetch(executor_id).catch(() => null)
  if (!member) return

  const context_bias = get_context_bias(member)
  const result       = track_event(guild.id, executor_id, event_type, context_bias)

  const client = guild.client

  if (result.tier === "quarantine") {
    if (is_already_quarantined(guild.id, executor_id)) return

    mark_quarantined(guild.id, executor_id)

    const incident_id = randomUUID()

    // - save snapshots to DB before executing - \\
    for (const snap of channel_snapshots) {
      await save_channel_snapshot({ ...snap, incident_id, guild_id: guild.id })
    }
    for (const snap of role_snapshots) {
      await save_role_snapshot({ ...snap, incident_id, guild_id: guild.id })
    }

    await execute_quarantine(
      client,
      guild,
      executor_id,
      result.score,
      result.event_types,
      result.event_count,
      incident_id,
      channel_snapshots,
      role_snapshots,
    )
    return
  }

  if (result.tier === "soft_alert") {
    const config = await get_config(guild.id)
    if (result.score >= config.soft_alert_threshold) {
      await send_soft_alert(
        client,
        guild,
        executor_id,
        result.score,
        result.event_types,
        result.event_count,
      )
    }
    return
  }

  if (result.tier === "observe") {
    // - silent internal record, no staff notification - \\
    const incident_id = randomUUID()
    await save_incident({
      incident_id,
      guild_id      : guild.id,
      executor_id,
      event_types   : result.event_types,
      event_count   : result.event_count,
      final_score   : result.score,
      action_taken  : "observe",
      previous_roles: [],
      reverted      : false,
      reverted_by   : null,
      reverted_at   : null,
      timestamp     : Math.floor(Date.now() / 1000),
    })
  }
}
