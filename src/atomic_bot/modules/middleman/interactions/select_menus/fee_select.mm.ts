import { StringSelectMenuInteraction } from "discord.js"
import { modal }                        from "@shared/utils"

/**
 * @description Handles fee payer selection — shows item detail modal
 * @param {StringSelectMenuInteraction} interaction - The string select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_fee_select(interaction: StringSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_fee_select:")) return false

  const parts     = interaction.customId.split(":")
  const range_id  = parts[1]
  const seller_id = parts[2]
  const buyer_id  = parts[3]
  const fee_value = interaction.values[0]

  if (!range_id || !seller_id || !buyer_id || !fee_value) {
    await interaction.reply({ content: "Invalid selection. Please try again.", ephemeral: true })
    return true
  }

  await interaction.showModal(
    modal.create_modal(
      `middleman_ticket_details:${range_id}:${seller_id}:${buyer_id}:${fee_value}`,
      "Detail Barang",
      modal.create_text_input({
        custom_id  : "jenis_barang",
        label      : "Jenis Barang yang Dijual",
        style      : "short",
        required   : true,
        placeholder: "Contoh: Akun Roblox, Robux, dll.",
      }),
      modal.create_text_input({
        custom_id  : "harga_barang",
        label      : "Harga Barang yang Dijual (Rp)",
        style      : "short",
        required   : true,
        placeholder: "Contoh: 150000",
      }),
    )
  )
  return true
}
