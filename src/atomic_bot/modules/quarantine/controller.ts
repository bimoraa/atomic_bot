/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 隔离功能的模块控制器 - \\
// - module controller for the quarantine feature - \\
import { Client, GuildMember, Guild, Role, TextChannel } from "discord.js"
import { component, time }                               from "@shared/utils"
import { log_error }                                     from "@shared/utils/error_logger"
import { is_admin, is_staff }                            from "@shared/database/settings/permissions"
import {
  add_quarantine,
  remove_quarantine,
  get_quarantine,
  is_quarantined,
  add_quarantine_history,
  get_quarantine_history,
  get_quarantine_count,
}                                                        from "@shared/database/managers/quarantine_manager"
import { quarantine_member_options, release_quarantine_options } from "@models/quarantine.model"
import { __quarantine_role_id }                          from "@constants/roles"
import { __quarantine_log_channel_id }                   from "@constants/channels"

/**
 * @description Get quarantine role for a guild
 * @param guild - Discord Guild
 * @returns Promise<Role | null>
 */
async function get_quarantine_role(guild: Guild): Promise<Role | null> {
  return guild.roles.fetch(__quarantine_role_id).catch(() => null)
}

/**
 * @description Quarantine a member by removing their roles and applying quarantine role
 * @param options - Quarantine options
 * @returns Promise with success status and message
 */
export async function quarantine_member(options: quarantine_member_options) {
  const { client, guild, executor, target, days, reason } = options

  try {
    const executor_is_admin = is_admin(executor) || executor.permissions.has("Administrator")

    if (!executor_is_admin && !is_staff(executor) && !executor.permissions.has("ModerateMembers")) {
      return {
        success : false,
        error   : "You don't have permission to quarantine members.",
      }
    }

    if (target.id === executor.id) {
      return {
        success : false,
        error   : "You cannot quarantine yourself.",
      }
    }

    // - 管理员跳过角色层级检查 - \\
    // - skip role hierarchy check for admins - \\
    if (!executor_is_admin && executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot quarantine a member with equal or higher role.",
      }
    }

    // - 强制刷新拉取，避免 manageable 检查读到旧缓存 - \\
    // - force fresh fetch to avoid stale cache on manageable check - \\
    const fresh_target = await guild.members.fetch({ user: target.id, force: true }).catch(() => null)
    if (!fresh_target) {
      return {
        success : false,
        error   : "Could not fetch member data. They may have left the server.",
      }
    }

    if (!fresh_target.manageable) {
      return {
        success : false,
        error   : "I cannot quarantine this member. My role must be higher than theirs.",
      }
    }

    // - 检查是否已被隔离 - \\
    // - check if already quarantined - \\
    const already_quarantined = await is_quarantined(fresh_target.id, guild.id)
    if (already_quarantined) {
      return {
        success : false,
        error   : "This member is already quarantined.",
      }
    }

    const quarantine_role = await get_quarantine_role(guild)
    if (!quarantine_role) {
      return {
        success : false,
        error   : "Quarantine role not found in this server.",
      }
    }

    if (guild.members.me!.roles.highest.position <= quarantine_role.position) {
      return {
        success : false,
        error   : "I cannot assign the quarantine role because it is higher than my highest role.",
      }
    }

    const managed_roles = fresh_target.roles.cache
      .filter(role => role.managed || role.id === guild.id)
      .map(role => role.id)

    const previous_roles = fresh_target.roles.cache
      .filter(role => !role.managed && role.id !== guild.id)
      .map(role => role.id)

    // - 移除全部角色并添加隔离角色 - \\
    // - remove all roles and add quarantine role - \\
    await fresh_target.roles.set([...managed_roles, quarantine_role.id], reason)

    const now        = Math.floor(Date.now() / 1000)
    const release_at = now + (days * 24 * 60 * 60)

    await add_quarantine(
      fresh_target.id,
      guild.id,
      quarantine_role.id,
      previous_roles,
      reason,
      executor.id,
      days
    )

    // - 记录历史并发送日志 - \\
    // - record history and send log - \\
    await add_quarantine_history(fresh_target.id, guild.id, reason, executor.id, days)

    const avatar_url = fresh_target.user.displayAvatarURL({ size: 512 })

    const [total_count, history] = await Promise.all([
      get_quarantine_count(fresh_target.id, guild.id),
      get_quarantine_history(fresh_target.id, guild.id),
    ])
    const prev_history = history.slice(1)

    const history_lines = prev_history.length > 0
      ? prev_history.map((h, i) => [
          `**${i + 1}.** ${time.full_date_time(h.quarantined_at)}`,
          `> Reason: ${h.reason}`,
          `> Duration: ${h.days} days`,
          `> By: <@${h.quarantined_by}>`,
        ].join("\n"))
      : ["- No previous quarantine history"]

    const log_channel = await guild.channels.fetch(__quarantine_log_channel_id).catch(() => null) as TextChannel | null
    if (log_channel?.isTextBased()) {
      const log_msg = component.build_message({
        components: [
          component.container({
            accent_color : 0xED4245,
            components   : [
              component.section({
                content   : "### Member Quarantined",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${fresh_target.id}>`,
                `- Quarantined by: <@${executor.id}>`,
                `- Duration: ${days} days`,
                `- Release: ${time.relative_time(release_at)} || ${time.full_date_time(release_at)}`,
                `- Reason: ${reason}`,
                `- Total Quarantines: **${total_count}x**`,
              ]),
              component.divider(),
              component.text([
                `### Riwayat Karantina Sebelumnya`,
                ...history_lines,
              ]),
            ],
          }),
        ],
      })
      await log_channel.send(log_msg).catch(() => {})
    }

    const quarantine_message = component.build_message({
      components: [
        component.container({
          accent_color: 0x808080,
          components: [
            component.section({
              content   : "### Member Quarantined",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${fresh_target.id}>`,
              `- Quarantined by: <@${executor.id}>`,
              `- Duration: ${days} days`,
              `- Release: ${time.relative_time(release_at)} || ${time.full_date_time(release_at)}`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.danger_button("Release Early", `quarantine_release:${fresh_target.id}`)
            ),
          ],
        }),
      ],
    })

    return {
      success : true,
      message : quarantine_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Quarantine Member Controller", {
      executor_id : executor.id,
      target_id   : target.id,
      days,
      reason,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/**
 * @description Release a member from quarantine
 * @param options - Release options
 * @returns Promise with success status
 */
export async function release_quarantine(options: release_quarantine_options) {
  const { client, guild, user_id } = options

  try {
    const quarantine_data = await get_quarantine(user_id, guild.id)
    if (!quarantine_data) {
      return {
        success : false,
        error   : "Member is not quarantined.",
      }
    }

    const member = await guild.members.fetch(user_id).catch(() => null)
    if (!member) {
      await remove_quarantine(user_id, guild.id)
      return {
        success : false,
        error   : "Member not found in server.",
      }
    }

    // - FETCH GUILD ROLES VIA REST TO BYPASS EMPTY CACHE - \\
    const guild_roles = await guild.roles.fetch().catch(() => null)

    // - REMOVE QUARANTINE ROLE FIRST - \\
    await member.roles.remove(__quarantine_role_id, "Released from quarantine").catch(() => {})

    // - RESTORE PREVIOUS ROLES THAT STILL EXIST - \\
    const roles_to_restore = quarantine_data.previous_roles.filter(role_id =>
      role_id !== __quarantine_role_id && (guild_roles?.has(role_id) ?? true)
    )

    if (roles_to_restore.length > 0) {
      await member.roles.add(roles_to_restore, "Restoring roles after quarantine").catch(() => {})
    }

    // - ALWAYS REMOVE DB RECORD REGARDLESS OF ROLE RESTORE RESULT - \\
    await remove_quarantine(user_id, guild.id)

    return {
      success : true,
      user_id : user_id,
    }
  } catch (err) {
    await log_error(client, err as Error, "Release Quarantine Controller", {
      user_id,
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}
