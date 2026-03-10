/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

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
