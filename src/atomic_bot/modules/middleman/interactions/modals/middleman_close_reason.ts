/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理中间人关闭原因 modal 的提交 - \
// - handles the middleman close reason modal submission - \
import { ModalSubmitInteraction, ThreadChannel, TextChannel } from "discord.js"
import { close_ticket } from "@shared/database/unified_ticket"
import { cancel_middleman_ticket, get_middleman_ticket } from "@shared/database/managers/middleman.manager"
import { api } from "@shared/utils"
import { get_ticket_config } from "@shared/database/unified_ticket"

/**
 * @description handles close reason modal submission for middleman ticket
 * @param {ModalSubmitInteraction} interaction - the modal submit interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_close_reason_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "middleman_close_reason_modal") return false

  const thread       = interaction.channel as ThreadChannel
  const close_reason = interaction.fields.getTextInputValue("close_reason")

  await interaction.deferReply({ flags: 64 })

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  // - 标记工单为已取消 - \\
  // - mark ticket as cancelled in database - \\
  await cancel_middleman_ticket(thread.id, close_reason)

  // - 删除已有日志消息 - \\
  // - delete log message if exists - \\
  const ticket = await get_middleman_ticket(thread.id)
  if (ticket?.log_message_id) {
    const config = get_ticket_config("middleman")
    if (config?.log_channel_id) {
      const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
      if (log_channel) {
        const token = api.get_token()
        await api.delete_message(log_channel.id, ticket.log_message_id, token)
      }
    }
  }

  await close_ticket({
    thread,
    client   : interaction.client,
    closed_by: interaction.user,
    reason   : close_reason,
  })

  await interaction.editReply({ content: "Ticket closed successfully." })
  return true
}
