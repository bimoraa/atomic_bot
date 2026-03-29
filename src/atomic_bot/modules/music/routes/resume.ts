/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /resume 斜杠命令，恢复播放 - \\
// - /resume slash command, resumes paused playback - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@shared/utils"
import { log_error }                                        from "@shared/utils/error_logger"
import { handle_pause_resume }                              from "../controllers/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume a paused track"),

  /**
   * @description handles /resume. Resumes playback if something is paused.
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const result = await handle_pause_resume(interaction.guild!.id)

      if (!result.success) {
        await interaction.reply({
          ...component.build_message({
            components: [component.container({ components: [component.text("Nothing is currently playing.")] })],
          }), ephemeral: true,
        })
        return
      }

      const state = result.is_paused ? "Paused" : "Resumed"

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("22C55E"),
              components  : [component.text(`Playback **${state}**.`)],
            }),
          ],
        }),
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /resume", {
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
