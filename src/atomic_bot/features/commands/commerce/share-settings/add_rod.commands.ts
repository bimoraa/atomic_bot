/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /share-settings add-rod，添加鱼竿设置分享 - \
// - /share-settings add-rod command, adds a rod settings entry - \
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }         from "@shared/types/command"
import { api, component }  from "@utils"
import { log_error }       from "@utils/error_logger"
import * as share_settings from "@commands/commerce/share-settings/controller/share_settings.controller"

/**
 * - 执行添加钓竿命令 - \\
 * - execute add rod command - \\
 * @param {ChatInputCommandInteraction} interaction - command interaction
 * @returns {Promise<void>}
 */
async function execute_add_rod(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  try {
    const rod_name = interaction.options.getString("rod_name", true)
    const result   = await share_settings.add_rod_option(interaction.client, rod_name)

    if (!result) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Failed to add rod"),
            ],
          }),
        ],
      }))
      return
    }

    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Rod added"),
          ],
        }),
      ],
    }))
  } catch (error) {
    await log_error(interaction.client, error as Error, "add_rod_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to add rod"),
          ],
        }),
      ],
    }))
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("add-rod")
    .setDescription("Add rod option")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName("rod_name").setDescription("Rod name").setRequired(true)) as SlashCommandBuilder,

  execute : execute_add_rod,
}
