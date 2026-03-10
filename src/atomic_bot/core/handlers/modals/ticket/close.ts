/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理关闭票务 modal 的提交 - \
// - handles the ticket close modal submission - \
import { ModalSubmitInteraction, ThreadChannel } from "discord.js"
import { close_ticket } from "@shared/database/unified_ticket"

export async function handle(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== "priority_close_reason_modal") return false

  const thread       = interaction.channel as ThreadChannel
  const close_reason = interaction.fields.getTextInputValue("close_reason")

  await interaction.deferReply({ flags: 64 })

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  await close_ticket({
    thread,
    client:    interaction.client,
    closed_by: interaction.user,
    reason:    close_reason,
  })

  await interaction.editReply({ content: "Ticket closed." })
  return true
}
