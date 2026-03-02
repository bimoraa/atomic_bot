import { ModalSubmitInteraction } from "discord.js"
import { open_middleman_ticket }  from "../../controllers/middleman_controller"
import { log_error }              from "@shared/utils/error_logger"

/**
 * @description Handles transaction details modal for middleman ticket creation
 * @param {ModalSubmitInteraction} interaction - The modal submit interaction
 * @returns {Promise<boolean>} - Returns true if handled, false otherwise
 */
export async function handle_middleman_ticket_details_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_ticket_details:")) return false

  const parts      = interaction.customId.split(":")
  const range_id   = parts[1]
  const partner_id = parts[2]

  if (!range_id || !partner_id) {
    await interaction.reply({ content: "Invalid submission. Please try again.", ephemeral: true })
    return true
  }

  const penjual   = interaction.fields.getTextInputValue("penjual")
  const pembeli   = interaction.fields.getTextInputValue("pembeli")
  const jenis     = interaction.fields.getTextInputValue("jenis_barang")
  const harga     = interaction.fields.getTextInputValue("harga_barang")
  const fee_oleh  = interaction.fields.getTextInputValue("fee_oleh")

  await interaction.deferReply({ ephemeral: true })

  try {
    const result = await open_middleman_ticket({
      interaction,
      range_id,
      partner_id,
      transaction: { penjual, pembeli, jenis, harga, fee_oleh },
    })

    if (!result.success) {
      await interaction.editReply({ content: result.error || "Failed to create ticket." })
      return true
    }

    await interaction.editReply({ content: result.message || "Ticket created successfully!" })
  } catch (err) {
    await log_error(interaction.client, err as Error, "Middleman Ticket Details Modal", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId ?? undefined,
    }).catch(() => {})
    await interaction.editReply({ content: "An error occurred. Please try again." })
  }

  return true
}
