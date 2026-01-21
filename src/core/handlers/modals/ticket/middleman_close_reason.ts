import { ModalSubmitInteraction, ThreadChannel, TextChannel } from "discord.js"
import { close_ticket } from "../../../../shared/database/unified_ticket"
import { cancel_middleman_ticket, get_middleman_ticket } from "../../../../shared/database/managers/middleman_manager"
import { api } from "../../../../shared/utils"
import { get_ticket_config } from "../../../../shared/database/unified_ticket"

/**
 * @description Handles close reason modal submission for middleman ticket
 * @param {ModalSubmitInteraction} interaction - The modal submit interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_close_reason_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "middleman_close_reason_modal") return false

  const thread       = interaction.channel as ThreadChannel
  const close_reason = interaction.fields.getTextInputValue("close_reason")

  await interaction.deferReply({ ephemeral: true })

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  // - MARK TICKET AS CANCELLED IN DATABASE - \\
  await cancel_middleman_ticket(thread.id, close_reason)

  // - DELETE LOG MESSAGE IF EXISTS - \\
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
