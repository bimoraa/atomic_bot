/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 音乐前缀命令处理器 (a!play, a!skip, a!stop, a!pause, a!resume, a!queue) - \\
// - music prefix command handler (a!play, a!skip, a!stop, a!pause, a!resume, a!queue) - \\
import { Message, GuildMember, Client, VoiceBasedChannel } from "discord.js"
import { component }                                        from "@utils"
import { log_error }                                        from "@utils/error_logger"
import {
  handle_play_prefix,
  handle_skip,
  handle_stop,
  handle_pause_resume,
  build_queue_message,
}                                                           from "@commands/media/music/controller/music.controller"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const __prefix         = "a!"
const __music_commands = ["play", "skip", "stop", "pause", "resume", "queue"] as const

// ─── TYPES ────────────────────────────────────────────────────────────────────
type music_command = typeof __music_commands[number]

/**
 * @description handles music prefix commands triggered by messages starting with "a!".
 *              Covers: a!play, a!skip, a!stop, a!pause, a!resume, a!queue.
 * @param {Message} message - discord message
 * @param {Client}  client  - discord client instance
 * @returns {Promise<boolean>} true if a music command was handled, false otherwise
 */
export async function handle_music_prefix_command(message: Message, client: Client): Promise<boolean> {
  if (!message.content.startsWith(__prefix)) return false
  if (!message.guild) return false

  const args    = message.content.slice(__prefix.length).trim().split(/ +/)
  const command = args.shift()?.toLowerCase() as music_command | undefined

  if (!command || !(__music_commands as readonly string[]).includes(command)) return false

  const guild_id = message.guild.id
  const user_id  = message.author.id

  try {
    // ─ a!play ─────────────────────────────────────────────────────────────────
    if (command === "play") {
      const query = args.join(" ").trim()

      if (!query) {
        await message.reply({
          ...component.build_message({
            components: [
              component.container({
                components: [
                  component.text(["## Usage", "`a!play <URL or search query>`"]),
                ],
              }),
            ],
          }),
        })
        return true
      }

      const member        = message.member as GuildMember
      const voice_channel = member?.voice?.channel as VoiceBasedChannel | null

      if (!voice_channel) {
        await message.reply({
          ...component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("EF4444"),
                components  : [component.text("You must be in a voice channel to use this command.")],
              }),
            ],
          }),
        })
        return true
      }

      await handle_play_prefix({ message, voice_channel, query, client })
      return true
    }

    // ─ a!skip ─────────────────────────────────────────────────────────────────
    if (command === "skip") {
      const raw    = parseInt(args[0] ?? "1", 10)
      const amount = isNaN(raw) ? 1 : Math.max(1, Math.min(10, raw))
      const result = await handle_skip(guild_id, amount)

      await message.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: result.success ? component.from_hex("F59E0B") : component.from_hex("EF4444"),
              components  : [
                component.text(
                  result.success
                    ? [
                        `Skipped **${result.skipped}**`,
                        result.up_next ? `Up next: **${result.up_next}**` : "Queue is now empty.",
                      ]
                    : "Nothing is currently playing."
                ),
              ],
            }),
          ],
        }),
      })
      return true
    }

    // ─ a!stop ─────────────────────────────────────────────────────────────────
    if (command === "stop") {
      const was_playing = await handle_stop(guild_id)

      await message.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: was_playing ? component.from_hex("EF4444") : component.from_hex("555555"),
              components  : [
                component.text(
                  was_playing
                    ? "Stopped playback and left the voice channel."
                    : "Nothing is currently playing."
                ),
              ],
            }),
          ],
        }),
      })
      return true
    }

    // ─ a!pause / a!resume ─────────────────────────────────────────────────────
    if (command === "pause" || command === "resume") {
      const result = await handle_pause_resume(guild_id)
      const state  = result.is_paused ? "Paused" : "Resumed"

      await message.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: result.success ? component.from_hex("F59E0B") : component.from_hex("555555"),
              components  : [
                component.text(result.success ? `Playback **${state}**.` : "Nothing is currently playing."),
              ],
            }),
          ],
        }),
      })
      return true
    }

    // ─ a!queue ────────────────────────────────────────────────────────────────
    if (command === "queue") {
      const raw  = parseInt(args[0] ?? "1", 10)
      const page = isNaN(raw) ? 1 : raw
      const msg  = build_queue_message(guild_id, page)

      await message.reply({ ...msg })
      return true
    }

    return false
  } catch (err) {
    await log_error(client, err as Error, `Music Prefix a!${command}`, { user_id, guild_id }).catch(() => {})

    await message.reply({
      ...component.build_message({
        components: [
          component.container({
            accent_color: component.from_hex("EF4444"),
            components  : [component.text("An error occurred while processing that command.")],
          }),
        ],
      }),
    }).catch(() => {})

    return true
  }
}
