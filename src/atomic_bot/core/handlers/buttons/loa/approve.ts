/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理批准 LOA 请假的按钮 - \
// - handles the approve LOA button - \
import { ButtonInteraction }         from "discord.js"
import { approve_loa, has_loa_permission } from "../../controllers/loa_controller"

export async function handle_loa_approve(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content  : "This can only be used in a server",
      ephemeral: true,
    })
    return
  }

  const member_roles = interaction.member.roles as any
  if (!has_loa_permission(member_roles)) {
    await interaction.reply({
      content  : "You don't have permission to approve LOA requests",
      ephemeral: true,
    })
    return
  }

  const result = await approve_loa({
    message_id : interaction.message.id,
    approver_id: interaction.user.id,
    client     : interaction.client,
    guild_id   : interaction.guild.id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to approve LOA request",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.update(result.message!)
}
