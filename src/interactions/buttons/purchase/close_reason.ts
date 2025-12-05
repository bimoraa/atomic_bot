import { ButtonInteraction, GuildMember } from "discord.js"
import { is_admin } from "../../../functions/permissions"
import { modal } from "../../../utils"

export async function handle_purchase_close_reason(interaction: ButtonInteraction) {
  if (!is_admin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: "Only staff can use this button.",
      flags: 64,
    })
    return
  }

  const close_modal = modal.create_modal(
    "purchase_close_reason_modal",
    "Close Ticket with Reason",
    modal.create_text_input({
      custom_id: "close_reason",
      label: "Reason",
      style: "paragraph",
      placeholder: "Enter the reason for closing this ticket...",
      required: true,
    })
  )

  await interaction.showModal(close_modal)
}
