/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke controller: quarantine execution, undo, and staff alerts - \\
import {
  Client,
  Guild,
  GuildMember,
  TextChannel,
  PermissionFlagsBits,
}                                     from "discord.js"
import { component, time }            from "@utils"
import { log_error }                  from "@utils/error_logger"
import {
  save_incident,
  get_incident,
  mark_incident_reverted,
  get_channel_snapshots,
  get_role_snapshots,
  get_config,
}                                     from "@managers/anti_nuke_manager"
import { mark_quarantined, clear_user } from "@integrations/cache/anti_nuke_tracker"
import { anti_nuke_channel_snapshot,
  anti_nuke_role_snapshot,
  anti_nuke_action,
}                                     from "@models/anti_nuke.model"
import { __quarantine_role_id }       from "@constants/roles"

const __timeout_duration_ms = 28 * 24 * 60 * 60 * 1000

// ─── quarantine execution ─────────────────────────────────────────────────────

/**
 * @description execute immediate quarantine on a suspected nuker
 * @param client            - Discord client
 * @param guild             - Discord Guild
 * @param executor_id       - user ID of the suspected nuker
 * @param score             - composite risk score
 * @param event_types       - array of unique event types detected
 * @param event_count       - total number of events in the window
 * @param incident_id       - unique incident identifier
 * @param channel_snapshots - captured deleted channel data
 * @param role_snapshots    - captured deleted role data
 * @returns Promise<void>
 */
export async function execute_quarantine(
  client           : Client,
  guild            : Guild,
  executor_id      : string,
  score            : number,
  event_types      : string[],
  event_count      : number,
  incident_id      : string,
  channel_snapshots: anti_nuke_channel_snapshot[],
  role_snapshots   : anti_nuke_role_snapshot[],
): Promise<void> {
  try {
    const member = await guild.members.fetch(executor_id).catch(() => null)
    if (!member) return

    // - skip if already quarantined this session - \\
    mark_quarantined(guild.id, executor_id)

    const quarantine_role = await guild.roles.fetch(__quarantine_role_id).catch(() => null)
    const bot_member      = guild.members.me

    if (!quarantine_role || !bot_member) {
      console.log(`[ - ANTI-NUKE - ] quarantine role or bot member not found in ${guild.id}`)
      return
    }

    if (bot_member.roles.highest.position <= quarantine_role.position) {
      console.log(`[ - ANTI-NUKE - ] bot role too low to apply quarantine role in ${guild.id}`)
      return
    }

    // - save previous roles for potential restore - \\
    // - direct fetch to get accurate role list - \\
    const fresh_member   = await guild.members.fetch({ user: executor_id, force: true }).catch(() => null)
    const previous_roles = fresh_member
      ? [...fresh_member.roles.cache.keys()].filter(id => id !== guild.id)
      : []

    // - strip all roles and apply quarantine + timeout - \\
    await fresh_member?.roles.set([quarantine_role.id]).catch(() => {})
    await fresh_member?.timeout(__timeout_duration_ms, "Anti-Nuke: Automatic quarantine").catch(() => {})

    // - save incident to DB - \\
    await save_incident({
      incident_id,
      guild_id      : guild.id,
      executor_id,
      event_types   : event_types,
      event_count,
      final_score   : score,
      action_taken  : "quarantine" as anti_nuke_action,
      previous_roles,
      reverted      : false,
      reverted_by   : null,
      reverted_at   : null,
      timestamp     : Math.floor(Date.now() / 1000),
    })

    await send_quarantine_alert(
      client, guild, executor_id, score,
      event_types, event_count, incident_id,
      channel_snapshots, role_snapshots
    )

    console.log(`[ - ANTI-NUKE - ] quarantined ${executor_id} in ${guild.id} (score: ${score})`)
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Execute Quarantine", {
      guild_id   : guild.id,
      executor_id,
    }).catch(() => {})
  }
}

// ─── soft alert ───────────────────────────────────────────────────────────────

/**
 * @description send a soft alert to staff without taking action on the executor
 * @param client      - Discord client
 * @param guild       - Discord Guild
 * @param executor_id - user ID of the suspected nuker
 * @param score       - composite risk score
 * @param event_types - array of unique event types detected
 * @param event_count - total number of events in the window
 * @returns Promise<void>
 */
export async function send_soft_alert(
  client      : Client,
  guild       : Guild,
  executor_id : string,
  score       : number,
  event_types : string[],
  event_count : number,
): Promise<void> {
  try {
    const config     = await get_config(guild.id)
    const log_ch_id  = config.log_channel_id

    if (!log_ch_id) return

    const log_channel = await guild.channels.fetch(log_ch_id).catch(() => null) as TextChannel | null
    if (!log_channel?.isTextBased()) return

    const staff_ping = config.staff_role_id ? `<@&${config.staff_role_id}>` : ""

    const msg = component.build_message({
      components: [
        component.container({
          accent_color: 0xFEE75C,
          components  : [
            component.text([
              "### Anti-Nuke: Suspicious Activity Detected",
              `- User: <@${executor_id}>`,
              `- Score: **${score}** (threshold: ${config.soft_alert_threshold})`,
              `- Events: ${event_count}x (${event_types.join(", ")})`,
              `- Status: Monitoring — no action taken yet`,
            ]),
          ],
        }),
      ],
    })

    await log_channel.send({
      ...msg,
      content: staff_ping,
      allowedMentions: { roles: config.staff_role_id ? [config.staff_role_id] : [] },
    }).catch(() => {})
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Soft Alert", { guild_id: guild.id }).catch(() => {})
  }
}

// ─── quarantine alert ─────────────────────────────────────────────────────────

async function send_quarantine_alert(
  client           : Client,
  guild            : Guild,
  executor_id      : string,
  score            : number,
  event_types      : string[],
  event_count      : number,
  incident_id      : string,
  channel_snapshots: anti_nuke_channel_snapshot[],
  role_snapshots   : anti_nuke_role_snapshot[],
): Promise<void> {
  try {
    const config     = await get_config(guild.id)
    const log_ch_id  = config.log_channel_id

    if (!log_ch_id) return

    const log_channel = await guild.channels.fetch(log_ch_id).catch(() => null) as TextChannel | null
    if (!log_channel?.isTextBased()) return

    const staff_ping       = config.staff_role_id ? `<@&${config.staff_role_id}>` : ""
    const channels_deleted = channel_snapshots.length
    const roles_deleted    = role_snapshots.length

    const restore_lines: string[] = []
    if (channels_deleted > 0) {
      restore_lines.push(`- Channels deleted: ${channels_deleted}x → restorable via Undo`)
    }
    if (roles_deleted > 0) {
      restore_lines.push(`- Roles deleted: ${roles_deleted}x → restorable via Undo`)
    }

    const msg = component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components  : [
            component.text([
              "### Anti-Nuke: Nuker Quarantined",
              `- User: <@${executor_id}>`,
              `- Score: **${score}**`,
              `- Events: ${event_count}x (${event_types.join(", ")})`,
              `- Action: All roles removed, timeout applied`,
              `- Incident ID: \`${incident_id}\``,
              ...(restore_lines.length > 0 ? restore_lines : ["- No destructive events captured"]),
            ]),
            component.divider(),
            component.action_row(
              component.danger_button("Undo Quarantine", `anti_nuke_undo:${incident_id}:${guild.id}`),
            ),
          ],
        }),
      ],
    })

    await log_channel.send({
      ...msg,
      content: staff_ping,
      allowedMentions: { roles: config.staff_role_id ? [config.staff_role_id] : [] },
    }).catch(() => {})
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Quarantine Alert", { guild_id: guild.id }).catch(() => {})
  }
}

// ─── undo ─────────────────────────────────────────────────────────────────────

/**
 * @description undo an anti-nuke quarantine: restore roles, remove timeout, recreate deleted objects
 * @param client      - Discord client
 * @param guild       - Discord Guild
 * @param incident_id - unique incident ID to undo
 * @param staff_id    - Discord user ID of the staff executing the undo
 * @returns Promise with success status and optional error message
 */
export async function undo_quarantine(
  client      : Client,
  guild       : Guild,
  incident_id : string,
  staff_id    : string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const incident = await get_incident(incident_id, guild.id)
    if (!incident) return { success: false, error: "Incident not found." }
    if (incident.reverted) return { success: false, error: "This incident was already reverted." }

    const member = await guild.members.fetch(incident.executor_id).catch(() => null)

    if (member) {
      // - restore previous roles - \\
      const valid_roles: string[] = []
      for (const role_id of incident.previous_roles) {
        const role = await guild.roles.fetch(role_id).catch(() => null)
        if (role) valid_roles.push(role_id)
      }

      await member.roles.set(valid_roles).catch(() => {})
      await member.timeout(null, `Anti-Nuke undo by <@${staff_id}>`).catch(() => {})
    }

    // - recreate deleted channels - \\
    const channel_snaps = await get_channel_snapshots(incident_id, guild.id)
    for (const snap of channel_snaps) {
      try {
        await guild.channels.create({
          name  : snap.channel_name,
          type  : snap.channel_type as any,
          parent: snap.parent_id ?? undefined,
          topic : snap.topic     ?? undefined,
          nsfw  : snap.nsfw,
          reason: `Anti-Nuke restore — incident ${incident_id}`,
        })
      } catch {
        // - skip individual channel create failures silently - \\
      }
    }

    // - recreate deleted roles - \\
    const role_snaps = await get_role_snapshots(incident_id, guild.id)
    for (const snap of role_snaps) {
      try {
        await guild.roles.create({
          name       : snap.role_name,
          color      : snap.color,
          hoist      : snap.hoist,
          mentionable: snap.mentionable,
          permissions: BigInt(snap.permissions_bf),
          reason     : `Anti-Nuke restore — incident ${incident_id}`,
        })
      } catch {
        // - skip individual role create failures silently - \\
      }
    }

    await mark_incident_reverted(incident_id, guild.id, staff_id)
    clear_user(guild.id, incident.executor_id)

    return { success: true }
  } catch (err) {
    await log_error(client, err as Error, "Anti-Nuke Undo Quarantine", {
      guild_id   : guild.id,
      incident_id,
      staff_id,
    }).catch(() => {})
    return { success: false, error: "An error occurred while undoing the quarantine." }
  }
}
