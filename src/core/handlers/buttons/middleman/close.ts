import { ButtonInteraction, ThreadChannel } from "discord.js"
import { close_ticket, get_ticket_config } from "../../../../shared/database/unified_ticket"

/**
 * @description Handles direct close for middleman ticket
 * @param {ButtonInteraction} interaction - The button interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_close(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_close:")) return false

  const config          = get_ticket_config("middleman")
  const authorized_users = config?.authorized_users || []

  if (!authorized_users.includes(interaction.user.id)) {
    await interaction.reply({
      content  : "You don't have permission to use this button.",
      ephemeral: true,
    })
    return true
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content  : "This can only be used in a ticket thread.",
      ephemeral: true,
    })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  await close_ticket({
    thread,
    client   : interaction.client,
    closed_by: interaction.user,
    reason   : "Closed by staff",
  })

  await interaction.editReply({ content: "Ticket closed successfully." })
  return true
}
