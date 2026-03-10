/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 回答统计选择菜单的交互注册 - \
// - registers the answer stats select menu interaction - \
// - 答题统计选择器 - \
// - answer stats select - \

import { StringSelectMenuInteraction, GuildMember } from "discord.js"
import { api } from "@shared/utils"
import { get_staff_stats, build_stats_panel } from "@atomic/modules/staff/commands/get_answer_stats"

export async function handle_answer_stats_select(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.deferUpdate()

  const staff_id = interaction.values[0]
  if (!staff_id) return

  const guild = interaction.guild
  if (!guild) return

  const member = await guild.members.fetch(staff_id).catch(() => null)
  if (!member) {
    await interaction.followUp({ content: "Staff member not found.", ephemeral: true })
    return
  }

  const stats   = await get_staff_stats(staff_id)
  const message = build_stats_panel(
    staff_id,
    member.displayName,
    member.displayAvatarURL({ extension: "png", size: 128 }),
    stats
  )

  await api.edit_interaction_response(
    interaction.client.user.id,
    interaction.token,
    message
  )
}
