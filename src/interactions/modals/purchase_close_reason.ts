import { ModalSubmitInteraction, ThreadChannel } from "discord.js"
import { close_purchase_ticket_fn } from "../buttons/purchase/close_function"

export async function handle_purchase_close_reason_modal(interaction: ModalSubmitInteraction) {
  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content: "This can only be used in a ticket thread.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const reason = interaction.fields.getTextInputValue("close_reason")

  await close_purchase_ticket_fn({
    thread,
    client: interaction.client,
    closed_by: interaction.user,
    reason,
  })

  await interaction.editReply({
    content: "Ticket closed with reason.",
  })
}
