/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /pause 斜杠命令，暂停当前曲目 - \\
// - /pause slash command, pauses the current track - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@utils"
import { log_error }                                        from "@utils/error_logger"
import { handle_pause_resume }                              from "@commands/media/music/controller/music.controller"

export const _music_pause_cmd = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track"),

  /**
   * @description handles /pause. Pauses playback if something is playing and not already paused.
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
              accent_color: component.from_hex("F59E0B"),
              components  : [component.text(`Playback **${state}**.`)],
            }),
          ],
        }),
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /pause", {
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
