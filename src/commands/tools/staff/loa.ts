import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../../types/command"
import { get_loa_panel }                                    from "../../../interactions/controller/loa_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loa")
    .setDescription("View Leave of Absence panel"),

  async execute(interaction: ChatInputCommandInteraction) {
    const loa_panel = get_loa_panel()
    await interaction.reply(loa_panel)
  },
}
