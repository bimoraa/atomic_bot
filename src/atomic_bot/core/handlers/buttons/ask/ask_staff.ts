/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理点击「联系客服」按钮后弹出 modal 的逻辑 - \
// - handles the ask staff button, opens a modal - \
import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js"

export async function handle_ask_staff_button(interaction: ButtonInteraction): Promise<void> {
  if (interaction.replied || interaction.deferred) return

  const modal = new ModalBuilder()
    .setCustomId("ask_staff_modal")
    .setTitle("Ask a Staff")

  const question_input = new TextInputBuilder()
    .setCustomId("question")
    .setLabel("Your Question")
    .setPlaceholder("Type your question here...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(question_input)
  modal.addComponents(row)

  await interaction.showModal(modal)
}
