/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /stop 斜杠命令，停止播放并离开语音频道 - \\
// - /stop slash command, stops playback and leaves the voice channel - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@utils"
import { log_error }                                        from "@utils/error_logger"
import { handle_stop }                                      from "@commands/media/music/controller/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback, clear the queue, and leave the voice channel"),

  /**
   * @description handles /stop. Stops playback and disconnects the bot from VC.
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const was_playing = await handle_stop(interaction.guild!.id)

      if (!was_playing) {
        await interaction.reply({
          ...component.build_message({
            components: [component.container({ components: [component.text("Nothing is currently playing.")] })],
          }), ephemeral: true,
        })
        return
      }

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("EF4444"),
              components  : [component.text("Stopped playback and left the voice channel.")],
            }),
          ],
        }),
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /stop", {
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
