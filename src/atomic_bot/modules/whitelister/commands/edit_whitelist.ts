// - /whitelist edit，编辑白名单用户信息 - \
// - /whitelist edit command, edits a whitelisted user's info - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "@shared/types/command"
import { member_has_role }  from "@shared/utils/discord_api"
import { edit_whitelist }      from "../controller"

const __allowed_role_id = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("edit_whitelist")
    .setDescription("Edit whitelist user settings")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to edit")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("New note for the whitelist")
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
    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server.",
        ephemeral: true,
      })
      return
    }

    const member = interaction.member as GuildMember

    if (!member || !member.roles || member_has_role(member, __allowed_role_id) === false) {
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

    const result = await edit_whitelist({
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
        content: result.error || "Failed to edit whitelist",
      })
    }
  },
}
