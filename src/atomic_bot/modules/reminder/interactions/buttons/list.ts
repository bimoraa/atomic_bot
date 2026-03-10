/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 查看提醒列表按钮的交互注册 - \
// - registers the reminder list button interaction - \
import { ButtonInteraction }    from "discord.js"
import { get_reminder_list } from "../../controller"
import { ButtonHandler }     from "@shared/types/interaction"

export async function handle_reminder_list(interaction: ButtonInteraction): Promise<void> {
  const result = await get_reminder_list({
    user_id: interaction.user.id,
    client : interaction.client,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to fetch reminders",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.reply({
    ...result.message,
    flags: (result.message!.flags ?? 0) | 64,
  }).catch(() => {})
}

export const button: ButtonHandler = {
  custom_id: "reminder_list",
  execute: handle_reminder_list,
}
