import { ButtonInteraction } from "discord.js"
import { component, api, format } from "../../../utils"
import { http, env, logger }     from "../../../utils"

const __log           = logger.create_logger("free_leaderboard")
const FREE_PROJECT_ID = "cd7560b7384fd815dafd993828c40d2b"

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export async function handle_free_leaderboard(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const all_users_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
    const all_users_res = await http.get<any>(all_users_url, get_headers())

    if (!all_users_res.users || !Array.isArray(all_users_res.users)) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "Failed to fetch leaderboard data.",
              ]),
            ],
          }),
        ],
      }))
      return
    }

    const sorted = all_users_res.users
      .filter((u: any) => u.total_executions > 0)
      .sort((a: any, b: any) => b.total_executions - a.total_executions)
      .slice(0, 10)

    if (sorted.length === 0) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  "## Execution Leaderboard",
                  "",
                  "No executions yet. Be the first!",
                ],
                thumbnail : format.logo_url,
              }),
            ],
          }),
        ],
      }))
      return
    }

    const leaderboard_lines = sorted.map((user: any, index: number) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `**${index + 1}.**`
      const discord_mention = user.discord_id ? `<@${user.discord_id}>` : user.note || "Unknown"
      return `${medal} ${discord_mention} - **${user.total_executions}** executions`
    })

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                "## Execution Leaderboard",
                "Top 10 users by total executions:",
                "",
                ...leaderboard_lines,
              ],
              thumbnail : format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (error) {
    __log.error("Failed to get leaderboard:", error)

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Error",
              "Failed to connect to server. Please try again later.",
            ]),
          ],
        }),
      ],
    }))
  }
}
