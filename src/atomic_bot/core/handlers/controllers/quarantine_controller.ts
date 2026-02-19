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

interface quarantine_member_options {
  client   : Client
  guild    : Guild
  executor : GuildMember
  target   : GuildMember
  days     : number
  reason   : string
}

interface release_quarantine_options {
  client   : Client
  guild    : Guild
  user_id  : string
}

const __quarantine_role_id  = "1265318689130024992"
const __quarantine_log_id   = "1474186051366031380"

/**
 * @description Get quarantine role for a guild
 * @param guild - Discord Guild
 * @returns Promise<Role | null>
 */
async function get_quarantine_role(guild: Guild): Promise<Role | null> {
  const quarantine_role = guild.roles.cache.get(__quarantine_role_id) || 
                          await guild.roles.fetch(__quarantine_role_id).catch(() => null)
  
  return quarantine_role
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

    // - SKIP ROLE HIERARCHY CHECK FOR ADMINS - \\
    if (!executor_is_admin && executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot quarantine a member with equal or higher role.",
      }
    }

    // - FORCE FRESH FETCH TO AVOID STALE CACHE ON MANAGEABLE CHECK - \\
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

    // - CHECK IF ALREADY QUARANTINED - \\
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

    // - REMOVE ALL ROLES AND ADD QUARANTINE ROLE - \\
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

    // - RECORD HISTORY AND SEND LOG - \\
    await add_quarantine_history(fresh_target.id, guild.id, reason, executor.id, days)

    const avatar_url   = fresh_target.user.displayAvatarURL({ size: 512 })
    const total_count  = await get_quarantine_count(fresh_target.id, guild.id)
    const history      = await get_quarantine_history(fresh_target.id, guild.id)
    const prev_history = history.slice(1)

    const history_lines = prev_history.length > 0
      ? prev_history.map((h, i) => [
          `**${i + 1}.** ${time.full_date_time(h.quarantined_at)}`,
          `> Reason: ${h.reason}`,
          `> Duration: ${h.days} days`,
          `> By: <@${h.quarantined_by}>`,
        ].join("\n"))
      : ["- No previous quarantine history"]

    const log_channel = guild.channels.cache.get(__quarantine_log_id) as TextChannel | undefined
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

    // - RESTORE PREVIOUS ROLES - \\
    const managed_roles = member.roles.cache
      .filter(role => role.managed || role.id === guild.id)
      .map(role => role.id)

    const valid_roles = quarantine_data.previous_roles.filter(role_id => 
      guild.roles.cache.has(role_id)
    )

    await member.roles.set([...managed_roles, ...valid_roles], "Released from quarantine")
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
