// - /loa 斜杠命令，管理员工请假 - \
// - /loa slash command, manages staff leave of absence - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { get_loa_panel }                                    from "../controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loa")
    .setDescription("View Leave of Absence panel"),

  async execute(interaction: ChatInputCommandInteraction) {
    const loa_panel = get_loa_panel()
    await interaction.reply(loa_panel)
  },
}
