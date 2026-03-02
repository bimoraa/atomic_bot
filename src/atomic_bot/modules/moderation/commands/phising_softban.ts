import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  GuildMember,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"
import type { MessageContextMenuCommand } from "@shared/types/command"
import { component }                      from "@shared/utils"
import { log_error }                      from "@shared/utils/error_logger"
import { is_admin, is_staff }             from "@shared/database/settings/permissions"

// - 1 DAY IN SECONDS - \\
const __softban_delete_seconds = 1 * 24 * 60 * 60

/**
 * @description Build a simple component v2 message
 * @param lines - Text lines for the message
 * @returns Message payload
 */
function build_message(lines: string[]) {
  return component.build_message({
    components: [
      component.container({
        components: [component.text(lines)],
      }),
    ],
  })
}

const phising_softban: MessageContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Phising Softban")
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as ContextMenuCommandBuilder,

  /**
   * @description Softban the author of a message for phishing - DMs them then bans + unbans
   * @param interaction - Message context menu interaction
   */
  async execute(interaction: MessageContextMenuCommandInteraction): Promise<void> {
    const executor = interaction.member as GuildMember
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({ ...build_message(["This command can only be used in a server."]), ephemeral: true })
      return
    }

    if (!is_admin(executor) && !is_staff(executor) && !executor.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ ...build_message(["You do not have permission to use this command."]), ephemeral: true })
      return
    }

    const target_user = interaction.targetMessage.author

    if (!target_user) {
      await interaction.reply({ ...build_message(["Could not resolve the message author."]), ephemeral: true })
      return
    }

    if (target_user.id === interaction.user.id) {
      await interaction.reply({ ...build_message(["You cannot softban yourself."]), ephemeral: true })
      return
    }

    if (target_user.id === guild.ownerId) {
      await interaction.reply({ ...build_message(["You cannot softban the server owner."]), ephemeral: true })
      return
    }

    const target_member = await guild.members.fetch(target_user.id).catch(() => null)

    if (target_member) {
      const bot_member = await guild.members.fetchMe()

      if (target_member.roles.highest.position >= bot_member.roles.highest.position) {
        await interaction.reply({ ...build_message(["I cannot softban this user due to role hierarchy."]), ephemeral: true })
        return
      }

      if (executor.id !== guild.ownerId && target_member.roles.highest.position >= executor.roles.highest.position) {
        await interaction.reply({ ...build_message(["You cannot softban this user due to role hierarchy."]), ephemeral: true })
        return
      }
    }

    await interaction.deferReply({ ephemeral: true })

    const __reason = "Phishing"

    try {
      // - SEND DM BEFORE BAN - \\
      await target_user.send(
        build_message([
          `## You have been softbanned from ${guild.name}`,
          `**Reason:** ${__reason}`,
          `**Moderator:** ${interaction.user.tag}`,
          ``,
          `You can rejoin the server using an invite link.`,
        ])
      ).catch(() => {})

      await guild.members.ban(target_user.id, {
        reason             : `Phising Softban by ${interaction.user.tag}: ${__reason}`,
        deleteMessageSeconds: __softban_delete_seconds,
      })

      await guild.members.unban(target_user.id, `Phising Softban cleanup by ${interaction.user.tag}`)

      await interaction.editReply(
        build_message([
          `## User Softbanned`,
          `**User:** <@${target_user.id}> (${target_user.tag})`,
          `**Moderator:** <@${interaction.user.id}>`,
          `**Reason:** ${__reason}`,
          `**Messages Deleted:** 1 day`,
        ])
      )

      console.log(`[ - PHISING SOFTBAN - ] ${target_user.tag} softbanned by ${interaction.user.tag}`)
    } catch (error) {
      await log_error(interaction.client, error as Error, "phising_softban", {
        executor  : interaction.user.tag,
        target    : target_user.tag,
        guild     : guild.name,
      })

      await interaction.editReply(
        build_message([`Failed to softban user: ${error instanceof Error ? error.message : "Unknown error"}`])
      )
    }
  },
}

export default phising_softban
