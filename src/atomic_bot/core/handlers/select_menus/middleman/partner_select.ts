import { UserSelectMenuInteraction } from "discord.js"
import { is_middleman_service_open }  from "@shared/database/managers/middleman_service_manager"
import { component, modal }           from "@shared/utils"

/**
 * @description Handles partner selection — shows transaction details modal before creating ticket
 * @param {UserSelectMenuInteraction} interaction - The user select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled, false otherwise
 */
export async function handle_middleman_partner_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_partner_select:")) return false

  // - CHECK SERVICE STATUS BEFORE RESPONDING (NO DEFER, MUST STAY UNDER 3s) - \\
  const is_open = await is_middleman_service_open(interaction.guildId || "")
  if (!is_open) {
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components: [component.text("## Middleman Service is Closed")],
            accent_color: 15277667,
          }),
          component.container({
            components: [
              component.text(
                "Layanan Midman sedang ditutup sementara.\n\n" +
                "Mohon tunggu pengumuman resmi mengenai pembukaan kembali layanan.\n" +
                "Segala bentuk transaksi yang mengatasnamakan midman di luar tanggung jawab kami."
              ),
            ],
          }),
        ],
      }),
      ephemeral: true,
    })
    return true
  }

  const range_id   = interaction.customId.split(":")[1]
  const partner_id = interaction.values[0]

  if (!range_id || !partner_id) {
    await interaction.reply({ content: "Invalid selection. Please try again.", ephemeral: true })
    return true
  }

  if (partner_id === interaction.user.id) {
    await interaction.reply({ content: "You cannot select yourself as trading partner.", ephemeral: true })
    return true
  }

  // - SHOW TRANSACTION DETAILS MODAL - \\
  const details_modal = modal.create_modal(
    `middleman_ticket_details:${range_id}:${partner_id}`,
    "Detail Transaksi",
    modal.create_text_input({ custom_id: "penjual",      label: "Penjual",                      style: "short",     required: true }),
    modal.create_text_input({ custom_id: "pembeli",      label: "Pembeli",                      style: "short",     required: true }),
    modal.create_text_input({ custom_id: "jenis_barang", label: "Jenis Barang yang Dijual",     style: "short",     required: true }),
    modal.create_text_input({ custom_id: "harga_barang", label: "Harga Barang yang Dijual (Rp)", style: "short",    required: true }),
    modal.create_text_input({ custom_id: "fee_oleh",     label: "Fee oleh",                     style: "short",     required: true }),
  )

  await interaction.showModal(details_modal)
  return true
}
