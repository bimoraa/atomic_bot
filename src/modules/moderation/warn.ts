import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                        from "discord.js"
import { Command }      from "../../shared/types/command"
import { warn_member }  from "../../core/handlers/controllers/moderation_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for warning")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const reason   = interaction.options.getString("reason", true)
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

    const result = await warn_member({
      client   : interaction.client,
      guild,
      executor,
      target,
      reason,
    })

    if (result.success) {
      await interaction.reply({
        ...result.message,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to warn member",
        ephemeral : true,
      })
    }
  },
}
