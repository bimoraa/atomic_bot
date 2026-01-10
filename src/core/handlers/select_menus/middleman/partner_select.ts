import { UserSelectMenuInteraction } from "discord.js"
import { open_middleman_ticket } from "../../controllers/middleman_controller"

/**
 * @description Handles partner selection for middleman service and opens ticket
 * @param {UserSelectMenuInteraction} interaction - The user select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled, false otherwise
 */
export async function handle_middleman_partner_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_partner_select:")) return false

  await interaction.deferReply({ ephemeral: true })

  const range_id   = interaction.customId.split(":")[1]
  const partner_id = interaction.values[0]

  if (!range_id || !partner_id) {
    await interaction.editReply({ content: "Invalid selection. Please try again." })
    return true
  }

  if (partner_id === interaction.user.id) {
    await interaction.editReply({ content: "You cannot select yourself as trading partner." })
    return true
  }

  const result = await open_middleman_ticket({
    interaction,
    range_id,
    partner_id,
  })

  if (!result.success) {
    await interaction.editReply({ content: result.error || "Failed to create ticket." })
    return true
  }

  await interaction.editReply({ content: result.message || "Ticket created successfully!" })
  return true
}
