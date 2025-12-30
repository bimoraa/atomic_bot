import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "../../../types/command"
import { whitelist }        from "../../../interactions/controller/whitelister_controller"

const ALLOWED_ROLE_ID = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Whitelist a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to whitelist")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("Optional note for the whitelist")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days before expiration (leave empty for permanent)")
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
      await interaction.reply({
        content  : "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }
    const user = interaction.options.getUser("user") as User
    const note = interaction.options.getString("note") || undefined
    const days = interaction.options.getInteger("days") || undefined

    if (!user) {
      await interaction.reply({
        content  : "Invalid user.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await whitelist({
      user,
      client     : interaction.client,
      note,
      days,
      executor_id: interaction.user.id,
    })

    if (result.success) {
      if (interaction.channel && "send" in interaction.channel) {
        await interaction.channel.send(result.message!)
      }
      await interaction.deleteReply()
    } else {
      await interaction.editReply({
        content: result.error || "Failed to whitelist user",
      })
    }
  },
}
