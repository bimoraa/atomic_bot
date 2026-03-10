/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理新增提醒 modal 的提交 - \
// - handles the add new reminder modal submission - \
// - 新增提醒模态框 - \
// - add new reminder modal - \

import { ModalSubmitInteraction } from "discord.js"
import { add_reminder }           from "@atomic/modules/reminder/controller"

const max_minutes = 10080

export async function handle_reminder_add_new_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "reminder_add_new_modal") return false

  const minutes_input = interaction.fields.getTextInputValue("reminder_minutes")
  const note_input    = interaction.fields.getTextInputValue("reminder_note")
  const minutes_num   = parseInt(minutes_input, 10)

  if (isNaN(minutes_num) || minutes_num < 1 || minutes_num > max_minutes) {
    await interaction.reply({
      content  : `Invalid minutes. Must be between 1 and ${max_minutes}.`,
      ephemeral: true,
    })
    return true
  }

  const result = await add_reminder({
    user_id : interaction.user.id,
    client  : interaction.client,
    minutes : minutes_num,
    note    : note_input,
    guild_id: interaction.guild?.id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to create reminder",
      ephemeral: true,
    })
    return true
  }

  await interaction.reply({
    content  : result.message || "Reminder scheduled! Check your DM.",
    ephemeral: true,
  })

  return true
}
