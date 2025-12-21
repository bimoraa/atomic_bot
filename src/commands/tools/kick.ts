import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                      from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for kicking")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const reason   = interaction.options.getString("reason") || "No reason provided"

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content   : "You don't have permission to kick members.",
        ephemeral : true,
      })
      return
    }

    if (!target.kickable) {
      await interaction.reply({
        content   : "I cannot kick this member. They may have a higher role than me.",
        ephemeral : true,
      })
      return
    }

    if (target.id === executor.id) {
      await interaction.reply({
        content   : "You cannot kick yourself.",
        ephemeral : true,
      })
      return
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      await interaction.reply({
        content   : "You cannot kick a member with equal or higher role.",
        ephemeral : true,
      })
      return
    }

    try {
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

      await interaction.reply({
        ...kick_message,
        ephemeral: true,
      })
    } catch (error) {
      const error_message = error instanceof Error ? error.message : "Unknown error"
      await interaction.reply({
        content   : `Failed to kick member: ${error_message}`,
        ephemeral : true,
      })
    }
  },
}
