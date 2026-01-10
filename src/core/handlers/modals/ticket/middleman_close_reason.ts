import { ModalSubmitInteraction, ThreadChannel } from "discord.js"
import { close_ticket } from "../../../../shared/database/unified_ticket"

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

  await close_ticket({
    thread,
    client   : interaction.client,
    closed_by: interaction.user,
    reason   : close_reason,
  })

  await interaction.editReply({ content: "Ticket closed successfully." })
  return true
}
