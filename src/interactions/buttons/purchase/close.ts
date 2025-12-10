import { ButtonInteraction, ThreadChannel } from "discord.js"
import { purchase_ticket_parent_id } from "../../shared/ticket_state"
import { close_purchase_ticket_fn } from "./close_function"

export async function handle_purchase_close(interaction: ButtonInteraction) {
  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content: "This command can only be used in a ticket thread.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  await close_purchase_ticket_fn({
    thread,
    client: interaction.client,
    closed_by: interaction.user,
  })

  await interaction.editReply({
    content: "Ticket closed.",
  })
}
