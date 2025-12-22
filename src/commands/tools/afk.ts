import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command }     from "../../types/command"
import { component, api } from "../../utils"
import { set_afk }     from "../../functions/afk"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for being AFK")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("reason") || "AFK"

    set_afk(interaction.user.id, reason)

    await interaction.reply({
      content : `You are now AFK: **${reason}**`,
      flags   : 64,
    })
  },
}
