/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理脚本面板里「查看排行榜」的按钮 - \
// - handles the view leaderboard button in the scripts panel - \
import { ButtonInteraction } from "discord.js"
import { component, api } from "@shared/utils"
import { get_execution_leaderboard } from "../../controllers/service_provider_controller"

/**
 * @description Handles viewing execution leaderboard for service provider script
 * @param {ButtonInteraction} interaction - Discord button interaction
 */
export async function handle_view_leaderboard(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const leaderboard_result = await get_execution_leaderboard({ client: interaction.client })

  if (!leaderboard_result.success || !leaderboard_result.data) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Error",
              `${leaderboard_result.error || "Failed to fetch leaderboard"}`,
            ]),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return
  }

  const leaderboard_data = leaderboard_result.data
  const top_users = leaderboard_data.slice(0, 10)

  let leaderboard_text = "## Execution Leaderboard - Top 10\n\n"

  top_users.forEach((user: any, index: number) => {
    const rank = index + 1
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`
    leaderboard_text += `${medal} <@${user.discord_id}> - **${user.total_executions.toLocaleString()}** executions\n`
  })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(leaderboard_text),
          component.divider(2),
          component.text(`Total Users: **${leaderboard_data.length}**`),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
}
