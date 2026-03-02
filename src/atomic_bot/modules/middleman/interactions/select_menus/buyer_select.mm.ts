import { UserSelectMenuInteraction } from "discord.js"
import { component }                  from "@shared/utils"

/**
 * @description Handles buyer selection — shows fee payer string-select next
 * @param {UserSelectMenuInteraction} interaction - The user select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_buyer_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_pembeli_select:")) return false

  const parts     = interaction.customId.split(":")
  const range_id  = parts[1]
  const seller_id = parts[2]
  const buyer_id  = interaction.values[0]

  if (!range_id || !seller_id || !buyer_id) {
    await interaction.reply({ content: "Invalid selection. Please try again.", ephemeral: true })
    return true
  }

  if (buyer_id === seller_id) {
    await interaction.reply({ content: "Pembeli tidak boleh sama dengan Penjual.", ephemeral: true })
    return true
  }

  await interaction.reply({
    ...component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Fee dibayar Oleh"),
            component.divider(2),
            component.text([
              `- Penjual : <@${seller_id}>`,
              `- Pembeli : <@${buyer_id}>`,
              "",
              "Silakan pilih siapa yang menanggung biaya rekber.",
            ]),
            {
              type: 1,
              components: [
                {
                  type       : 3,
                  custom_id  : `middleman_fee_select:${range_id}:${seller_id}:${buyer_id}`,
                  placeholder: "Pilih siapa yang membayar fee",
                  min_values : 1,
                  max_values : 1,
                  options    : [
                    { label: "Penjual",    value: "penjual", description: "Fee ditanggung oleh Penjual" },
                    { label: "Pembeli",    value: "pembeli", description: "Fee ditanggung oleh Pembeli" },
                    { label: "Dibagi Dua", value: "dibagi",  description: "Fee dibagi dua antara Penjual & Pembeli" },
                  ],
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
