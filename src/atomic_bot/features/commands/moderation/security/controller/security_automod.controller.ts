/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Message, PermissionFlagsBits }                                            from "discord.js"
import { component }                                                                        from "@utils"
import { log_error }                                                                        from "@utils/error_logger"
import {
  get_security_automod_config_or_default,
  list_security_automod_words,
}                                                                                           from "@managers/security_automod.manager"

/**
 * @description process one message against security automod banned-word rules
 * @param {Message} message - discord message
 * @param {Client} client - discord client
 * @returns {Promise<boolean>} true when message is handled by automod
 */
export async function handle_security_automod_message(message: Message, client: Client): Promise<boolean> {
  if (!message.inGuild() || message.author.bot) {
    return false
  }

  try {
    const config = await get_security_automod_config_or_default(message.guild.id)

    if (!config.enabled) {
      return false
    }

    const member = await message.guild.members.fetch(message.author.id).catch(async (error) => {
      await log_error(client, error as Error, "security_automod_member_fetch", {
        guild_id   : message.guild.id,
        user_id    : message.author.id,
        channel_id : message.channel.id,
        message_id : message.id,
      }).catch(() => {})

      return null
    })

    if (!member) {
      return false
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return false
    }

    const normalized_content = message.content.trim().toLowerCase()

    if (!normalized_content) {
      return false
    }

    const banned_words = await list_security_automod_words(message.guild.id)

    if (banned_words.length === 0) {
      return false
    }

    // - escape special regex chars in the banned word, then check word boundary - \\
    const matched_word = banned_words.find(word => {
      const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      return pattern.test(normalized_content)
    })

    if (!matched_word) {
      return false
    }

    await message.delete().catch(async (error) => {
      await log_error(client, error as Error, "security_automod_delete_message", {
        guild_id      : message.guild.id,
        user_id       : message.author.id,
        channel_id    : message.channel.id,
        message_id    : message.id,
        matched_word,
      }).catch(() => {})
    })

    await message.author.send({
      ...component.build_message({
        components: [
          component.container({
            accent_color : component.from_hex("#FEE75C"),
            components   : [
              component.text([
                "## Security Warning",
                `Your message in **${message.guild.name}** was removed by AutoMod.`,
                `Matched word: \`${matched_word}\``,
                "Please follow server rules.",
              ]),
            ],
          }),
        ],
      }),
    }).catch(async (error) => {
      await log_error(client, error as Error, "security_automod_dm_warning", {
        guild_id      : message.guild.id,
        user_id       : message.author.id,
        channel_id    : message.channel.id,
        message_id    : message.id,
        matched_word,
      }).catch(() => {})
    })

    if (config.log_channel_id) {
      const log_channel = await message.guild.channels.fetch(config.log_channel_id).catch(async (error) => {
        await log_error(client, error as Error, "security_automod_log_channel_fetch", {
          guild_id       : message.guild.id,
          user_id        : message.author.id,
          channel_id     : message.channel.id,
          message_id     : message.id,
          log_channel_id : config.log_channel_id || "",
        }).catch(() => {})

        return null
      })

      if (log_channel?.isTextBased()) {
        const message_url = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`

        await log_channel.send({
          ...component.build_message({
            components: [
              component.container({
                accent_color : component.from_hex("#ED4245"),
                components   : [
                  component.text([
                    "## Security AutoMod Triggered",
                    `User: <@${message.author.id}> (\`${message.author.id}\`)`,
                    `Channel: <#${message.channel.id}>`,
                    `Matched word: \`${matched_word}\``,
                    `Message: [Open Jump Link](${message_url})`,
                  ]),
                ],
              }),
            ],
          }),
        }).catch(async (error) => {
          await log_error(client, error as Error, "security_automod_send_log", {
            guild_id      : message.guild.id,
            user_id       : message.author.id,
            channel_id    : message.channel.id,
            message_id    : message.id,
            matched_word,
          }).catch(() => {})
        })
      }
    }

    return true
  } catch (error) {
    await log_error(client, error as Error, "security_automod_message", {
      guild_id   : message.guild.id,
      user_id    : message.author.id,
      channel_id : message.channel.id,
      message_id : message.id,
    }).catch(() => {})

    return false
  }
}
