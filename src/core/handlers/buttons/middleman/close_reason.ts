import { ButtonInteraction } from "discord.js"
import { modal } from "../../../../shared/utils"
import { get_ticket_config } from "../../../../shared/database/unified_ticket"

/**
 * @description Shows modal to input close reason for middleman ticket
 * @param {ButtonInteraction} interaction - The button interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_close_reason(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_close_reason:")) return false

  const config           = get_ticket_config("middleman")
  const authorized_users = config?.authorized_users || []

  if (!authorized_users.includes(interaction.user.id)) {
    await interaction.reply({
      content  : "You don't have permission to use this button.",
      ephemeral: true,
    })
    return true
  }

  const close_modal = modal.create_modal(
    "middleman_close_reason_modal",
    "Close Ticket with Reason",
    modal.create_text_input({
      custom_id  : "close_reason",
      label      : "Reason for closing",
      style      : "paragraph",
      placeholder: "Enter the reason for closing this ticket...",
      required   : true,
      min_length : 5,
      max_length : 500,
    })
  )

  await interaction.showModal(close_modal)
  return true
}
