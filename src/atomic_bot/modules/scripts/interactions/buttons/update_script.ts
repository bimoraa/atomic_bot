/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「更新脚本」按钮和选择菜单的交互处理 - \
// - handles the update script button and select menu interactions - \
import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js"
import { component }                                      from "@shared/utils"
import { log_error }                                      from "@shared/utils/error_logger"
import { build_select_update_message,
         perform_script_update }                          from "../../controller"

/**
 * @description Handles the update script select menu — updates the Update button with the chosen script_id
 * @param {StringSelectMenuInteraction} interaction - The string select menu interaction
 * @returns {Promise<boolean>} Returns true if handled
 */
const __allowed_user_id = "1118453649727823974"

export async function handle_script_update_select(interaction: StringSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("script_update_select:")) return false

  if (interaction.user.id !== __allowed_user_id) {
    await interaction.reply({ content: "You are not allowed to use this.", ephemeral: true })
    return true
  }

  const file_path = interaction.customId.split(":")[1] ?? ""
  const script_id = interaction.values[0]

  try {
    const message = await build_select_update_message(file_path, script_id)
    await interaction.update(message as any)
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Update Select", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId ?? undefined,
    }).catch(() => {})
    await interaction.reply({ content: "Failed to update selection.", ephemeral: true })
  }

  return true
}

/**
 * @description Handles the update script button — reads local file and PUTs content to Luarmor API
 * @param {ButtonInteraction} interaction - The button interaction
 * @returns {Promise<boolean>} Returns true if handled
 */
export async function handle_script_update_btn(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("script_update_btn:")) return false

  if (interaction.user.id !== __allowed_user_id) {
    await interaction.reply({ content: "You are not allowed to use this.", ephemeral: true })
    return true
  }

  const parts     = interaction.customId.split(":")
  const file_path = parts[1] ?? ""
  const script_id = parts[2] ?? ""

  await interaction.deferReply({ ephemeral: true })

  try {
    if (!script_id || script_id === "none") {
      await interaction.editReply({ content: "Please select a script from the dropdown first." })
      return true
    }

    const result  = await perform_script_update(file_path, script_id)

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(
              result.success
                ? [
                    `## Script Updated`,
                    `- Script : **${result.script_name}**`,
                    `- Version: \`${result.old_version}\` -> \`${result.new_version}\``,
                    `- File   : \`${file_path}\``,
                  ]
                : `## Update Failed\n${result.error ?? "Unknown error. Please try again."}`
            ),
          ],
        }),
      ],
    })

    await interaction.editReply(message as any)
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Update Button", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId ?? undefined,
    }).catch(() => {})
    await interaction.editReply({ content: "Failed to read or upload script. Please try again." })
  }

  return true
}
