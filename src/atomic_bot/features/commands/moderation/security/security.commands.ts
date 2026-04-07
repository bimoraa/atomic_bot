/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
}                                                                 from "discord.js"
import { Command }                                                from "@shared/types/command"
import { component }                                              from "@utils"
import { log_error }                                              from "@utils/error_logger"
import {
  add_security_automod_word,
  get_security_automod_config_or_default,
  list_security_automod_words,
  normalize_security_automod_word,
  remove_security_automod_word,
  upsert_security_automod_config,
}                                                                 from "@managers/security_automod.manager"

function build_security_message(title: string, lines: string[], accent: number = component.from_hex("#5865F2")): object {
  return component.build_message({
    components: [
      component.container({
        accent_color : accent,
        components   : [
          component.text([title, ...lines]),
        ],
      }),
    ],
  })
}

export const command: Command = {
  data   : new SlashCommandBuilder()
    .setName("security")
    .setDescription("Security command tools")
    .addSubcommandGroup((group) =>
      group
        .setName("automod")
        .setDescription("Auto moderation setup")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Add banned word for automod")
            .addStringOption((option) =>
              option
                .setName("word")
                .setDescription("Word to block")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Remove banned word from automod")
            .addStringOption((option) =>
              option
                .setName("word")
                .setDescription("Word to remove")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("List banned words")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("toggle")
            .setDescription("Enable or disable automod")
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Enable state")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("set-log")
            .setDescription("Set automod log channel")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Text channel for automod logs")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("status")
            .setDescription("Show automod status")
        )
    ) as SlashCommandBuilder,

  /**
   * @description execute security command actions
   * @param {ChatInputCommandInteraction} interaction - discord slash interaction
   * @returns {Promise<void>}
   */
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply({ flags: 64 })

    try {
      const has_permission = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)

      if (!has_permission) {
        const denied_message = build_security_message(
          "## Security Access Denied",
          ["You need Administrator permission to use this command."],
          component.from_hex("#ED4245"),
        )

        await interaction.editReply(denied_message)
        return
      }

      const subcommand_group = interaction.options.getSubcommandGroup(false)
      const subcommand       = interaction.options.getSubcommand()

      if (subcommand_group !== "automod") {
        await interaction.editReply(build_security_message("## Error", ["Unknown security command group."], component.from_hex("#ED4245")))
        return
      }

      if (!interaction.guildId) {
        await interaction.editReply(build_security_message("## Error", ["This command can only be used in a server."], component.from_hex("#ED4245")))
        return
      }

      if (subcommand === "add") {
        const raw_word        = interaction.options.getString("word", true)
        const normalized_word = normalize_security_automod_word(raw_word)

        if (!normalized_word) {
          await interaction.editReply(build_security_message("## Invalid Word", ["Word cannot be empty."], component.from_hex("#ED4245")))
          return
        }

        const inserted = await add_security_automod_word(interaction.guildId, normalized_word, interaction.user.id)

        if (!inserted) {
          await interaction.editReply(build_security_message("## Not Added", [`Word \`${normalized_word}\` already exists or invalid.`], component.from_hex("#FEE75C")))
          return
        }

        await interaction.editReply(build_security_message("## Word Added", [`Word \`${normalized_word}\` was added to security automod.`], component.from_hex("#57F287")))
        return
      }

      if (subcommand === "remove") {
        const raw_word        = interaction.options.getString("word", true)
        const normalized_word = normalize_security_automod_word(raw_word)

        if (!normalized_word) {
          await interaction.editReply(build_security_message("## Invalid Word", ["Word cannot be empty."], component.from_hex("#ED4245")))
          return
        }

        const removed = await remove_security_automod_word(interaction.guildId, normalized_word)

        if (!removed) {
          await interaction.editReply(build_security_message("## Not Found", [`Word \`${normalized_word}\` was not found.`], component.from_hex("#FEE75C")))
          return
        }

        await interaction.editReply(build_security_message("## Word Removed", [`Word \`${normalized_word}\` was removed from security automod.`], component.from_hex("#57F287")))
        return
      }

      if (subcommand === "list") {
        const words      = await list_security_automod_words(interaction.guildId)
        const words_list = words.length > 0
          ? words.map((word, index) => `${index + 1}. \`${word}\``).join("\n")
          : "- No banned words configured."

        await interaction.editReply(build_security_message("## Security AutoMod Words", [`Total: **${words.length}**`, "", words_list]))
        return
      }

      if (subcommand === "toggle") {
        const enabled = interaction.options.getBoolean("enabled", true)

        await upsert_security_automod_config(interaction.guildId, {
          enabled,
          updated_by : interaction.user.id,
          updated_at : Math.floor(Date.now() / 1000),
        })

        await interaction.editReply(build_security_message(
          "## Security AutoMod Updated",
          [`AutoMod is now **${enabled ? "enabled" : "disabled"}**.`],
          enabled ? component.from_hex("#57F287") : component.from_hex("#FEE75C"),
        ))
        return
      }

      if (subcommand === "set-log") {
        const channel = interaction.options.getChannel("channel", true)

        await upsert_security_automod_config(interaction.guildId, {
          log_channel_id : channel.id,
          updated_by     : interaction.user.id,
          updated_at     : Math.floor(Date.now() / 1000),
        })

        await interaction.editReply(build_security_message("## Security Log Channel Updated", [`New log channel: <#${channel.id}>`], component.from_hex("#57F287")))
        return
      }

      if (subcommand === "status") {
        const config = await get_security_automod_config_or_default(interaction.guildId)
        const words  = await list_security_automod_words(interaction.guildId)

        await interaction.editReply(build_security_message(
          "## Security AutoMod Status",
          [
            `Enabled: **${config.enabled ? "Yes" : "No"}**`,
            `Log Channel: ${config.log_channel_id ? `<#${config.log_channel_id}>` : "Not set"}`,
            `Total Words: **${words.length}**`,
          ],
        ))
        return
      }

      await interaction.editReply(build_security_message("## Error", ["Unknown automod action."], component.from_hex("#ED4245")))
    } catch (error) {
      await log_error(interaction.client, error as Error, "security_command", {
        user_id   : interaction.user.id,
        guild_id  : interaction.guildId || "",
        channel_id: interaction.channelId,
      }).catch(() => {})

      const err_message = build_security_message("## Error", ["Failed to process security command."], component.from_hex("#ED4245"))
      await interaction.editReply(err_message).catch(() => {})
    }
  },
}
