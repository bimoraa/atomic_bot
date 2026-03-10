/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { ButtonInteraction } from "discord.js"
import { component } from "@shared/utils"

export async function handle_middleman_penjual_self(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_penjual_self:")) return false
  
  const parts = interaction.customId.split(":")
  const range_id = parts[1]
  const seller_id = interaction.user.id

  await interaction.reply({
    ...component.build_message({
      components: [
        component.container({
          components: [
            component.text("## <:ticket:1411878131366891580> - Pilih Pembeli\n"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Penjual: <@${seller_id}>`,
            ]),
          ],
          spoiler: false,
        }),
        component.container({
          components: [
            component.text("Silakan pilih siapa yang menjadi Pembeli dalam transaksi ini.\n"),
            {
              type: 1,
              components: [
                {
                  type      : 5,
                  custom_id : `middleman_pembeli_select:${range_id}:${seller_id}`,
                  min_values: 1,
                  max_values: 1,
                } as any,
              ],
            },
            component.divider(2),
            component.section({
              content  : "Klik ini jika Pembelinya anda sendiri ->",
              accessory: component.secondary_button("Saya", `middleman_pembeli_self:${range_id}:${seller_id}`),
            }),
          ],
        }),
      ],
    }),
    ephemeral: true,
  })
  
  return true
}

export async function handle_middleman_pembeli_self(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_pembeli_self:")) return false

  const parts = interaction.customId.split(":")
  const range_id = parts[1]
  const seller_id = parts[2]
  const buyer_id = interaction.user.id

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
