/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 中间人流程里选择买家的菜单交互 - \
// - buyer select menu interaction for the middleman flow - \
import { UserSelectMenuInteraction }                                from "discord.js"
import { component }                                                from "@utils"
import { build_ticket_critical_error_reply,
         fetch_maintenance_mode }                                   from "@commands/commerce/middleman/controller/middleman.controller"

/**
 * @description handles buyer selection — shows fee payer string-select next
 * @param {UserSelectMenuInteraction} interaction - the user select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_buyer_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_pembeli_select:")) return false

  await interaction.deferReply({ flags: 64 })
  if (await fetch_maintenance_mode()) {
    await interaction.editReply(build_ticket_critical_error_reply())
    return true
  }

  const parts     = interaction.customId.split(":")
  const range_id  = parts[1]
  const seller_id = parts[2]
  const buyer_id  = interaction.values[0]

  if (!range_id || !seller_id || !buyer_id) {
    await interaction.editReply({ content: "Invalid selection. Please try again." })
    return true
  }

  if (buyer_id === seller_id) {
    await interaction.editReply({ content: "Pembeli tidak boleh sama dengan Penjual." })
    return true
  }

  await interaction.editReply({
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
  })
  return true
}
