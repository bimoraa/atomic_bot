import { Client, GuildMember, User, Guild } from "discord.js"
import { component }                        from "../../../shared/utils"
import { log_error }                        from "../../../shared/utils/error_logger"

interface ban_member_options {
  client       : Client
  guild        : Guild
  executor     : GuildMember
  user         : User
  reason       : string
  delete_days  : number
}

interface kick_member_options {
  client   : Client
  guild    : Guild
  executor : GuildMember
  target   : GuildMember
  reason   : string
}

interface timeout_member_options {
  client   : Client
  guild    : Guild
  executor : GuildMember
  target   : GuildMember
  duration : number
  reason   : string
}

interface warn_member_options {
  client   : Client
  guild    : Guild
  executor : GuildMember
  target   : GuildMember
  reason   : string
}

export async function ban_member(options: ban_member_options) {
  const { client, guild, executor, user, reason, delete_days } = options

  try {
    if (!executor.permissions.has("BanMembers")) {
      return {
        success : false,
        error   : "You don't have permission to ban members.",
      }
    }

    if (user.id === executor.id) {
      return {
        success : false,
        error   : "You cannot ban yourself.",
      }
    }

    const target = await guild.members.fetch(user.id).catch(() => null)

    if (target) {
      if (!target.bannable) {
        return {
          success : false,
          error   : "I cannot ban this member. They may have a higher role than me.",
        }
      }

      if (executor.roles.highest.position <= target.roles.highest.position) {
        return {
          success : false,
          error   : "You cannot ban a member with equal or higher role.",
        }
      }
    }

    const server_icon = guild.iconURL({ size: 512 }) || ""

    const dm_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### You have been banned",
              thumbnail : server_icon,
            }),
            component.divider(),
            component.text([
              `- Server: ${guild.name}`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
      ],
    })

    await user.send(dm_message).catch(() => {})

    await guild.members.ban(user, {
      reason,
      deleteMessageSeconds: delete_days * 24 * 60 * 60,
    })

    const avatar_url = user.displayAvatarURL({ size: 512 })

    const ban_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### Member Banned",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${user.id}>`,
              `- Banned by: <@${executor.id}>`,
              `- Reason: ${reason}`,
              `- Messages deleted: ${delete_days} days`,
            ]),
          ],
        }),
      ],
    })

    return {
      success : true,
      message : ban_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Ban Member Controller", {
      executor_id : executor.id,
      user_id     : user.id,
      reason,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export async function kick_member(options: kick_member_options) {
  const { client, guild, executor, target, reason } = options

  try {
    if (!executor.permissions.has("KickMembers")) {
      return {
        success : false,
        error   : "You don't have permission to kick members.",
      }
    }

    if (!target.kickable) {
      return {
        success : false,
        error   : "I cannot kick this member. They may have a higher role than me.",
      }
    }

    if (target.id === executor.id) {
      return {
        success : false,
        error   : "You cannot kick yourself.",
      }
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot kick a member with equal or higher role.",
      }
    }

    await target.kick(reason)

    const avatar_url = target.user.displayAvatarURL({ size: 512 })

    const kick_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### Member Kicked",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${target.id}>`,
              `- Kicked by: <@${executor.id}>`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
      ],
    })

    return {
      success : true,
      message : kick_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Kick Member Controller", {
      executor_id : executor.id,
      target_id   : target.id,
      reason,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export async function timeout_member(options: timeout_member_options) {
  const { client, guild, executor, target, duration, reason } = options

  try {
    if (!executor.permissions.has("ModerateMembers")) {
      return {
        success : false,
        error   : "You don't have permission to timeout members.",
      }
    }

    if (!target.moderatable) {
      return {
        success : false,
        error   : "I cannot timeout this member. They may have a higher role than me.",
      }
    }

    if (target.id === executor.id) {
      return {
        success : false,
        error   : "You cannot timeout yourself.",
      }
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot timeout a member with equal or higher role.",
      }
    }

    const timeout_ms  = duration * 60 * 1000
    const server_icon = guild.iconURL({ size: 512 }) || ""

    const dm_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### You have been timed out",
              thumbnail : server_icon,
            }),
            component.divider(),
            component.text([
              `- Server: ${guild.name}`,
              `- Duration: ${duration} minutes`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
      ],
    })

    await target.send(dm_message).catch(() => {})

    await target.timeout(timeout_ms, reason)

    const avatar_url = target.user.displayAvatarURL({ size: 512 })

    const timeout_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### Member Timed Out",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${target.id}>`,
              `- Timed out by: <@${executor.id}>`,
              `- Duration: ${duration} minutes`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
      ],
    })

    return {
      success : true,
      message : timeout_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Timeout Member Controller", {
      executor_id : executor.id,
      target_id   : target.id,
      duration,
      reason,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export async function warn_member(options: warn_member_options) {
  const { client, guild, executor, target, reason } = options

  try {
    if (!executor.permissions.has("ModerateMembers")) {
      return {
        success : false,
        error   : "You don't have permission to warn members.",
      }
    }

    if (target.id === executor.id) {
      return {
        success : false,
        error   : "You cannot warn yourself.",
      }
    }

    if (target.user.bot) {
      return {
        success : false,
        error   : "You cannot warn bots.",
      }
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      return {
        success : false,
        error   : "You cannot warn a member with equal or higher role.",
      }
    }

    const dm_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`### You have been warned in ${guild.name}\n`),
          ],
        }),
        component.container({
          components: [
            component.section({
              content  : [
                "### Details",
                `- **Reason:** ${reason}`,
                `- **Warned by:** ${executor.id}`,
              ].join("\n"),
              thumbnail: "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
            }),
          ],
        }),
      ],
    })

    try {
      await target.send(dm_message)
    } catch {}

    const { add_warning } = await import("../../../modules/moderation/warnings")
    await add_warning(guild.id, target.id, executor.id, reason)

    const avatar_url = target.user.displayAvatarURL({ size: 512 })

    const warn_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : "### Member Warned",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${target.id}>`,
              `- Warned by: <@${executor.id}>`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
      ],
    })

    return {
      success : true,
      message : warn_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Warn Member Controller", {
      executor_id : executor.id,
      target_id   : target.id,
      reason,
    }).catch(() => {})

    return {
      success : false,
      error   : err instanceof Error ? err.message : "Unknown error",
    }
  }
}
