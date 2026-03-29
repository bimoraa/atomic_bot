/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /queue 斜杠命令，显示当前播放队列 - \\
// - /queue slash command, shows the current playback queue - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { log_error }                                        from "@shared/utils/error_logger"
import { build_queue_message }                              from "../controllers/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue")
    .addIntegerOption(opt =>
      opt
        .setName("page")
        .setDescription("Page number (default: 1)")
        .setMinValue(1)
        .setRequired(false)
    ) as SlashCommandBuilder,

  /**
   * @description handles /queue. Shows the current queue with pagination.
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const guild_id = interaction.guild!.id
      const page     = interaction.options.getInteger("page") ?? 1
      const msg      = build_queue_message(guild_id, page)

      await interaction.reply({ ...msg, ephemeral: true})
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /queue", {
        user_id : interaction.user.id,
        guild_id: interaction.guild?.id,
      }).catch(() => {})

      await interaction.reply({
        content  : "An error occurred while fetching the queue.", ephemeral: true,
      }).catch(() => {})
    }
  },
}
