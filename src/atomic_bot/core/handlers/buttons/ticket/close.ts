/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理关闭票务的按钮 - \
// - handles the close ticket button - \
import { ButtonInteraction, ThreadChannel } from "discord.js"
import { close_ticket } from "@shared/database/unified_ticket"

export async function handle(interaction: ButtonInteraction) {
  if (interaction.customId !== "priority_close") return false

  await interaction.deferReply({ flags: 64 })

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  await close_ticket({
    thread,
    client:    interaction.client,
    closed_by: interaction.user,
  })

  await interaction.editReply({ content: "Ticket closed." })
  return true
}
