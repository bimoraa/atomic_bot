/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 中间人流程里选择手续费的菜单交互 - \
// - fee select menu interaction for the middleman flow - \
import { StringSelectMenuInteraction }                              from "discord.js"
import { modal }                                                    from "@shared/utils"
import { build_ticket_critical_error_reply,
         fetch_maintenance_mode }                                   from "@atomic/features/commands/commerce/middleman/controller/middleman.controller"

/**
 * @description handles fee payer selection — shows item detail modal
 * @param {StringSelectMenuInteraction} interaction - the string select menu interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_fee_select(interaction: StringSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_fee_select:")) return false

  await interaction.deferReply({ flags: 64 })
  if (await fetch_maintenance_mode()) {
    await interaction.editReply(build_ticket_critical_error_reply())
    return true
  }

  const parts     = interaction.customId.split(":")
  const range_id  = parts[1]
  const seller_id = parts[2]
  const buyer_id  = parts[3]
  const fee_value = interaction.values[0]

  if (!range_id || !seller_id || !buyer_id || !fee_value) {
    await interaction.reply({ content: "Invalid selection. Please try again.", ephemeral: true})
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
