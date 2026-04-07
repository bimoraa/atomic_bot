/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /play 指令，想听啥直接点 - \\
// - /play: drop your music query here - \\
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js"
import { Command }                                                        from "@shared/types/command"
import { component }                                                      from "@utils"
import { log_error }                                                      from "@utils/error_logger"
import { handle_play }                                                    from "@commands/media/music/controller/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from Spotify, Apple Music, YouTube, or a search query")
    .addStringOption(opt =>
      opt
        .setName("query")
        .setDescription("Spotify/Apple Music/YouTube URL or search query")
        .setRequired(true)
    ) as SlashCommandBuilder,

  /**
   * @description handles the /play command. Validates voice channel, then delegates to handle_play.
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const member        = interaction.member as GuildMember
      const voice_channel = member.voice.channel

      if (!voice_channel) {
        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({
                components: [component.text("You must be in a voice channel to use this command.")],
              }),
            ],
          }), ephemeral: true,
        })
        return
      }

      const query = interaction.options.getString("query", true)

      await handle_play({
        interaction,
        voice_channel,
        query,
        client: interaction.client,
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Command /play", {
        user_id : interaction.user.id,
        guild_id: interaction.guild?.id,
      }).catch(() => {})

      const err_msg = component.build_message({
        components: [component.container({ components: [component.text("An error occurred while executing this command.")] })],
      })

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ ...err_msg }).catch(() => {})
      } else {
        await interaction.reply({ ...err_msg, ephemeral: true}).catch(() => {})
      }
    }
  },
}
