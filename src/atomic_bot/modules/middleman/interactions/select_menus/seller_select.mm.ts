import { UserSelectMenuInteraction } from "discord.js"
import { is_middleman_service_open }  from "@shared/database/managers/middleman_service_manager"
import { component }                  from "@shared/utils"

/**
 * @description Handles seller selection — shows buyer user-select next
 * @param {UserSelectMenuInteraction} interaction - The user select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_seller_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_penjual_select:")) return false

  const is_open = await is_middleman_service_open(interaction.guildId || "")
  if (!is_open) {
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components  : [component.text("## Middleman Service is Closed")],
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
  const seller_id  = interaction.values[0]

  if (!range_id || !seller_id) {
    await interaction.reply({ content: "Invalid selection. Please try again.", ephemeral: true })
    return true
  }

  await interaction.reply({
    ...component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Pilih Pembeli"),
            component.divider(2),
            component.text([
              `- Penjual: <@${seller_id}>`,
              "",
              "Silakan pilih siapa yang menjadi Pembeli dalam transaksi ini.",
            ]),
            {
              type: 1,
              components: [
                {
                  type       : 5,
                  custom_id  : `middleman_pembeli_select:${range_id}:${seller_id}`,
                  placeholder: "Pilih Pembeli",
                  min_values : 1,
                  max_values : 1,
                },
              ],
            },
          ],
        }),
      ],
    }),
    ephemeral: true,
  })
  return true
}
