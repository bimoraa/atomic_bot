/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 音乐控制按钮处理器：Skip / Pause-Resume / Stop / Queue - \\
// - music control button handlers: Skip / Pause-Resume / Stop / Queue - \\
import { ButtonInteraction } from "discord.js"
import { component }         from "@shared/utils"
import { log_error }         from "@shared/utils/error_logger"
import {
  handle_skip,
  handle_stop,
  handle_pause_resume,
  build_queue_message,
}                            from "../../controllers/music.controller"

// ─── SKIP ─────────────────────────────────────────────────────────────────────
/**
 * @description handles the music_skip button interaction.
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handle_music_skip(interaction: ButtonInteraction): Promise<void> {
  try {
    const guild_id = interaction.guild!.id
    const result   = await handle_skip(guild_id, 1)

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
    await log_error(interaction.client, err as Error, "Music Button Skip", {
      user_id : interaction.user.id,
      guild_id: interaction.guild?.id,
    }).catch(() => {})

    await interaction.reply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred.")] })],
      }), ephemeral: true,
    }).catch(() => {})
  }
}

// ─── PAUSE / RESUME ────────────────────────────────────────────────────────────
/**
 * @description handles the music_pause_resume button interaction. Toggles pause state.
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handle_music_pause_resume(interaction: ButtonInteraction): Promise<void> {
  try {
    const guild_id = interaction.guild!.id
    const result   = await handle_pause_resume(guild_id)

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
    await log_error(interaction.client, err as Error, "Music Button Pause/Resume", {
      user_id : interaction.user.id,
      guild_id: interaction.guild?.id,
    }).catch(() => {})

    await interaction.reply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred.")] })],
      }), ephemeral: true,
    }).catch(() => {})
  }
}

// ─── STOP ─────────────────────────────────────────────────────────────────────
/**
 * @description handles the music_stop button interaction.
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handle_music_stop(interaction: ButtonInteraction): Promise<void> {
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
    await log_error(interaction.client, err as Error, "Music Button Stop", {
      user_id : interaction.user.id,
      guild_id: interaction.guild?.id,
    }).catch(() => {})

    await interaction.reply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred.")] })],
      }), ephemeral: true,
    }).catch(() => {})
  }
}

// ─── QUEUE PAGE ────────────────────────────────────────────────────────────────
/**
 * @description handles the music_queue:{page} button interaction. Shows paginated queue.
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handle_music_queue(interaction: ButtonInteraction): Promise<void> {
  try {
    const guild_id = interaction.guild!.id
    const page     = parseInt(interaction.customId.split(":")[1] ?? "1", 10)
    const msg      = build_queue_message(guild_id, isNaN(page) ? 1 : page)

    await interaction.reply({ ...msg, ephemeral: true})
  } catch (err) {
    await log_error(interaction.client, err as Error, "Music Button Queue", {
      user_id : interaction.user.id,
      guild_id: interaction.guild?.id,
    }).catch(() => {})

    await interaction.reply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred.")] })],
      }), ephemeral: true,
    }).catch(() => {})
  }
}
