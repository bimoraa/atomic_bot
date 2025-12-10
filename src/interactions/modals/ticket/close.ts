import { ModalSubmitInteraction, ThreadChannel } from "discord.js"
import { close_ticket } from "../../../functions/unified_ticket"

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
