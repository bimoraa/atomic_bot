/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理指南面板里示例按钮的跳转 - \
// - handles the guide panel example button - \
import { ButtonInteraction } from "discord.js"
import { guide_buttons } from "../../../../modules/setup/commands/guide_panel"
import { api, component } from "@shared/utils"

export async function handle_guide_button(interaction: ButtonInteraction) {
  const parts = interaction.customId.split("_")
  const guide_type = parts[2]
  const button_idx = parseInt(parts[3])

  const buttons = guide_buttons.get(guide_type)

  if (!buttons || !buttons[button_idx]) {
    await interaction.reply({
      content: "Button content tidak ditemukan.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(buttons[button_idx].content),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
}
