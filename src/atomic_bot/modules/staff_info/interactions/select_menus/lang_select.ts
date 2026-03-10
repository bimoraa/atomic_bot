/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 员工信息语言选择菜单的交互注册 - \
// - registers the language select menu for staff info - \
// - 员工信息语言选择器 - \
// - staff info language select - \

import { StringSelectMenuInteraction } from "discord.js"
import { log_error }                   from "@shared/utils/error_logger"

/**
 * - HANDLE STAFF INFO LANGUAGE SELECT - \\
 * 
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @returns {Promise<void>}
 */
export async function handle_staff_info_lang_select(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    const selected_lang = interaction.values[0]

    let content = ""

    switch (selected_lang) {
      case "id_main":
        content = "Language changed to **Indonesian (MAIN)**"
        break
      case "id_jaksel":
        content = "Language changed to **Indonesian (Jaksel Version)**\n\n*Feature coming soon...*"
        break
      case "en":
        content = "Language changed to **English**\n\n*Feature coming soon...*"
        break
      case "jp":
        content = "Language changed to **Japan**\n\n*Feature coming soon...*"
        break
      default:
        content = "Unknown language selected."
    }

    await interaction.reply({
      content,
      ephemeral: true,
    })
  } catch (err) {
    console.log("[ - STAFF INFO LANG SELECT - ] Error:", err)
    await log_error(interaction.client, err as Error, "Staff Info Language Select", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })

    if (!interaction.replied) {
      await interaction.reply({
        content: "Error changing language.",
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
