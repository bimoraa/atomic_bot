/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /skip 斜杠命令，跳过当前曲目 - \\
// - /skip slash command, skips the current track - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@shared/utils"
import { log_error }                                        from "@shared/utils/error_logger"
import { handle_skip }                                      from "../controllers/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track (or multiple)")
    .addIntegerOption(opt =>
      opt
        .setName("amount")
        .setDescription("Number of tracks to skip (default: 1)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    ) as SlashCommandBuilder,

  /**
   * @description handles /skip. Calls handle_skip and replies with result.
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const guild_id = interaction.guild!.id
      const amount   = interaction.options.getInteger("amount") ?? 1
      const result   = await handle_skip(guild_id, amount)

      if (!result.success) {
        await interaction.reply({
          ...component.build_message({
            components: [component.container({ components: [component.text("Nothing is currently playing.")] })],
          }), ephemeral: true,
        })
        return
      }

      const lines = [
        `Skipped **${result.skipped}**`,
        result.up_next ? `Up next: **${result.up_next}**` : "Queue is now empty.",
      ]

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("F59E0B"),
              components  : [component.text(lines)],
            }),
          ],
        }),
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /skip", {
        user_id : interaction.user.id,
        guild_id: interaction.guild?.id,
      }).catch(() => {})

      await interaction.reply({
        ...component.build_message({
          components: [component.container({ components: [component.text("An error occurred.")] })],
        }), ephemeral: true,
      }).catch(() => {})
    }
  },
}
