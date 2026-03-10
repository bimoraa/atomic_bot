/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /reminder-list 斜杠命令，查看所有提醒 - \
// - /reminder-list slash command, shows all your reminders - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { get_reminder_list }                                from "../controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminder-list")
    .setDescription("List your active reminders"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = await get_reminder_list({
      user_id: interaction.user.id,
      client : interaction.client,
    })

    if (!result.success) {
      await interaction.reply({
        content  : result.error || "Failed to fetch reminders",
        ephemeral: true,
      })
      return
    }

    await interaction.reply({
      ...result.message,
      flags: (result.message!.flags ?? 0) | 64,
    })
  },
}
