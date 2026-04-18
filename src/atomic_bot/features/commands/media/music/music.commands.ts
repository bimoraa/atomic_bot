/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /music 合并命令，整合所有音乐子命令 - \\
// - /music merged command, consolidates all music subcommands - \\
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js"
import { Command }                                                        from "@shared/types/command"
import { component }                                                      from "@utils"
import { log_error }                                                      from "@utils/error_logger"
import {
  handle_play,
  handle_pause_resume,
  handle_skip,
  handle_stop,
  build_queue_message,
} from "@commands/media/music/controller/music.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Music player controls")
    .addSubcommand(sub =>
      sub
        .setName("play")
        .setDescription("Play a song from Spotify, Apple Music, YouTube, or a search query")
        .addStringOption(opt =>
          opt
            .setName("query")
            .setDescription("Spotify/Apple Music/YouTube URL or search query")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("pause")
        .setDescription("Pause the current track")
    )
    .addSubcommand(sub =>
      sub
        .setName("resume")
        .setDescription("Resume a paused track")
    )
    .addSubcommand(sub =>
      sub
        .setName("skip")
        .setDescription("Skip the current track (or multiple)")
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("Number of tracks to skip (default: 1)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("stop")
        .setDescription("Stop playback, clear the queue, and leave the voice channel")
    )
    .addSubcommand(sub =>
      sub
        .setName("queue")
        .setDescription("Show the current music queue")
        .addIntegerOption(opt =>
          opt
            .setName("page")
            .setDescription("Page number (default: 1)")
            .setMinValue(1)
            .setRequired(false)
        )
    ) as SlashCommandBuilder,

  /**
   * @description handles /music with all subcommands: play, pause, resume, skip, stop, queue
   * @param {ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand()

    try {

      // !!! play !!! \\
      if (sub === "play") {
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
        return
      }

      // !!! pause / resume !!! \\
      if (sub === "pause" || sub === "resume") {
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
        const color = result.is_paused ? "F59E0B" : "22C55E"

        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex(color),
                components  : [component.text(`Playback **${state}**.`)],
              }),
            ],
          }),
        })
        return
      }

      // !!! skip !!! \\
      if (sub === "skip") {
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
        return
      }

      // !!! stop !!! \\
      if (sub === "stop") {
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
        return
      }

      // !!! queue !!! \\
      if (sub === "queue") {
        const guild_id = interaction.guild!.id
        const page     = interaction.options.getInteger("page") ?? 1
        const msg      = build_queue_message(guild_id, page)

        await interaction.reply({ ...msg, ephemeral: true })
        return
      }

    } catch (err) {
      await log_error(interaction.client, err as Error, `Command /music ${sub}`, {
        user_id : interaction.user.id,
        guild_id: interaction.guild?.id,
      }).catch(() => {})

      const err_msg = component.build_message({
        components: [component.container({ components: [component.text("An error occurred while executing this command.")] })],
      })

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ ...err_msg }).catch(() => {})
      } else {
        await interaction.reply({ ...err_msg, ephemeral: true }).catch(() => {})
      }
    }
  },
}
