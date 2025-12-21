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
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to timeout")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for timeout")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const duration = interaction.options.getInteger("duration") as number
    const reason   = interaction.options.getString("reason") || "No reason provided"

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content   : "You don't have permission to timeout members.",
        ephemeral : true,
      })
      return
    }

    if (!target.moderatable) {
      await interaction.reply({
        content   : "I cannot timeout this member. They may have a higher role than me.",
        ephemeral : true,
      })
      return
    }

    if (target.id === executor.id) {
      await interaction.reply({
        content   : "You cannot timeout yourself.",
        ephemeral : true,
      })
      return
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      await interaction.reply({
        content   : "You cannot timeout a member with equal or higher role.",
        ephemeral : true,
      })
      return
    }

    try {
      const timeout_ms  = duration * 60 * 1000
      const guild       = interaction.guild
      const server_icon = guild?.iconURL({ size: 512 }) || ""

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
                `- Server: ${guild?.name}`,
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

      await interaction.reply({
        ...timeout_message,
        ephemeral: true,
      })
    } catch (error) {
      const error_message = error instanceof Error ? error.message : "Unknown error"
      await interaction.reply({
        content   : `Failed to timeout member: ${error_message}`,
        ephemeral : true,
      })
    }
  },
}
