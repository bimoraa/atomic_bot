/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理中间人票务详情 modal 的提交 - \
// - handles the middleman ticket details modal submission - \
import { ModalSubmitInteraction } from "discord.js"
import { open_middleman_ticket }  from "../../controller"
import { log_error }              from "@shared/utils/error_logger"

/**
 * @description Handles transaction details modal — creates middleman ticket
 * @param {ModalSubmitInteraction} interaction - The modal submit interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_ticket_details_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_ticket_details:")) return false

  // - custom_id format: middleman_ticket_details:{range_id}:{penjual_id}:{pembeli_id}:{fee_value} - \\
  const parts      = interaction.customId.split(":")
  const range_id   = parts[1]
  const penjual_id = parts[2]
  const pembeli_id = parts[3]
  const fee_oleh   = parts[4]

  if (!range_id || !penjual_id || !pembeli_id || !fee_oleh) {
    await interaction.reply({ content: "Invalid submission. Please try again.", ephemeral: true })
    return true
  }

  const jenis = interaction.fields.getTextInputValue("jenis_barang")
  const harga = interaction.fields.getTextInputValue("harga_barang")

  await interaction.deferReply({ ephemeral: true })

  try {
    const result = await open_middleman_ticket({
      interaction,
      range_id,
      partner_id : penjual_id,
      transaction: { penjual_id, pembeli_id, jenis, harga, fee_oleh },
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
