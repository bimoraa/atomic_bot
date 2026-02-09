import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                        from "discord.js"
import { Command }        from "@shared/types/command"
import { timeout_member } from "../../core/handlers/controllers/moderation_controller"

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
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    const result = await timeout_member({
      client   : interaction.client,
      guild,
      executor,
      target,
      duration,
      reason,
    })

    if (result.success) {
      await interaction.reply({
        ...result.message,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to timeout member",
        ephemeral : true,
      })
    }
  },
}
