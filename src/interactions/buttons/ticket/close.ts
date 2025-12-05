import { ButtonInteraction } from "discord.js"
import { modal } from "../../../utils"

export async function handle(interaction: ButtonInteraction) {
  if (interaction.customId !== "close_ticket") return false

  const close_modal = modal.create_modal(
    "close_ticket_modal",
    "Close Ticket",
    modal.create_text_input({
      custom_id: "close_reason",
      label: "Close Reason",
      style: "paragraph",
      placeholder: "Enter the reason for closing this ticket...",
      required: true,
      max_length: 500,
    })
  )

  await interaction.showModal(close_modal)
  return true
}
