import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "../../../types/command"
import { whitelister }      from "../../../interactions/controllers"

const ALLOWED_ROLE_ID = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("get_user_stats")
    .setDescription("Get whitelist statistics for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get stats for")
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

    const result = await whitelister.get_user_stats({
      user,
      client     : interaction.client,
      executor_id: interaction.user.id,
    })

    if (result.success) {
      await interaction.editReply(result.message!)
    } else {
      await interaction.editReply({
        content: result.error || "Failed to get user stats",
      })
    }
  },
}
