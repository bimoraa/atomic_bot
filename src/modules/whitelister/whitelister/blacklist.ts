import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "../../../shared/types/command"
import { blacklist }        from "../../../core/handlers/controllers/whitelister_controller"

const ALLOWED_ROLE_ID = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Blacklist a user and remove from whitelist")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to blacklist")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server.",
        ephemeral: true,
      })
      return
    }

    const member = interaction.member as GuildMember

    if (!member || !member.roles || !member.roles.cache.has(ALLOWED_ROLE_ID)) {
      await interaction.reply({
        content  : "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const user = interaction.options.getUser("user") as User

    if (!user) {
      await interaction.reply({
        content  : "Invalid user.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await blacklist({
      user,
      client     : interaction.client,
      executor_id: interaction.user.id,
    })

    if (result.success) {
      if (interaction.channel && "send" in interaction.channel) {
        await interaction.channel.send(result.message!)
      }
      await interaction.deleteReply()
    } else {
      await interaction.editReply({
        content: result.error || "Failed to blacklist user",
      })
    }
  },
}
