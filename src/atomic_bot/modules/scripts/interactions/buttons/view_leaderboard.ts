// - 脚本面板「查看排行榜」按钮的交互注册 - \
// - registers the view leaderboard button for the scripts panel - \
// - 执行排行榜按钮 - \
// - execution leaderboard button - \

import { ButtonInteraction } from "discord.js"
import { component, api } from "@shared/utils"
import { get_execution_leaderboard } from "@atomic/modules/service_provider/controller"

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
