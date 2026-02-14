import { Client, GuildMember, Guild, Role } from "discord.js"
import { component, time }                 from "@shared/utils"
import { log_error }                       from "@shared/utils/error_logger"
import { 
  add_quarantine, 
  remove_quarantine, 
  get_quarantine,
  is_quarantined,
}                                          from "@shared/database/managers/quarantine_manager"

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

const __quarantine_role_id = "1265318689130024992"

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
    if (!executor.permissions.has("ModerateMembers")) {
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

    if (executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot quarantine a member with equal or higher role.",
      }
    }

    if (!target.manageable) {
      return {
        success : false,
        error   : "I cannot quarantine this member. They may have a higher role than me.",
      }
    }

    // - CHECK IF ALREADY QUARANTINED - \\
    const already_quarantined = await is_quarantined(target.id, guild.id)
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

    const previous_roles  = target.roles.cache
      .filter(role => role.id !== guild.id)
      .map(role => role.id)

    // - REMOVE ALL ROLES AND ADD QUARANTINE ROLE - \\
    await target.roles.set([quarantine_role.id], reason)

    const now        = Math.floor(Date.now() / 1000)
    const release_at = now + (days * 24 * 60 * 60)

    await add_quarantine(
      target.id,
      guild.id,
      quarantine_role.id,
      previous_roles,
      reason,
      executor.id,
      days
    )

    const avatar_url = target.user.displayAvatarURL({ size: 512 })

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
              `- Member: <@${target.id}>`,
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
              component.danger_button("Release Early", `quarantine_release:${target.id}`)
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
    const valid_roles = quarantine_data.previous_roles.filter(role_id => 
      guild.roles.cache.has(role_id)
    )

    await member.roles.set(valid_roles, "Released from quarantine")
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
