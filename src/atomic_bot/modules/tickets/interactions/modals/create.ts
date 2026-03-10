/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理创建票务 modal 的提交 - \
// - handles the ticket create modal submission - \
import { ModalSubmitInteraction, ButtonInteraction } from "discord.js"
import { open_ticket } from "@shared/database/unified_ticket"

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("priority_modal_")) return false

  const issue_type  = interaction.customId.replace("priority_modal_", "")
  const description = interaction.fields.getTextInputValue("ticket_description")

  await open_ticket({
    interaction:  interaction as unknown as ButtonInteraction,
    ticket_type:  "priority",
    issue_type:   issue_type,
    description:  description,
  })

  return true
}
