/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「查看排行榜」按钮处理 - \\
// - view leaderboard button handler for the scripts panel - \\

import { ButtonInteraction }          from "discord.js"
import { log_error }                  from "@shared/utils/error_logger"
import { component, api }             from "@shared/utils"
import { get_execution_leaderboard }  from "@atomic/modules/service_provider/controllers/service_provider.controller"

/**
 * @description handles the view leaderboard button — fetches and displays the top 10 execution leaderboard.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_view_leaderboard(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  try {
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
    const top_users        = leaderboard_data.slice(0, 10)

    let leaderboard_text = "## Execution Leaderboard - Top 10\n\n"

    top_users.forEach((user: any, index: number) => {
      const rank  = index + 1
      const medal = `${rank}.`
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
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script View Leaderboard", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
