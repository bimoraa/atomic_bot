import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format }        from "../../../utils"
import { http, env, logger }             from "../../../utils"

const __log           = logger.create_logger("free_stats")
const FREE_PROJECT_ID = "cd7560b7384fd815dafd993828c40d2b"

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export async function handle_free_get_stats(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  try {
    const check_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users?discord_id=${member.id}`
    const check_res = await http.get<any>(check_url, get_headers())

    let user: any = null

    if (check_res.users && Array.isArray(check_res.users) && check_res.users.length > 0) {
      user = check_res.users[0]
    } else if (check_res.user_key) {
      user = check_res
    } else if (Array.isArray(check_res) && check_res.length > 0) {
      user = check_res[0]
    }

    if (!user) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## No Key Found`,
                  `You don't have access to the free script.`,
                  ``,
                  `Please use the **Get Script** button first.`,
                ],
                thumbnail : format.logo_url,
              }),
            ],
          }),
        ],
      }))
      return
    }

    const all_users_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
    const all_users_res = await http.get<any>(all_users_url, get_headers())

    let leaderboard_text = "Unable to fetch leaderboard"

    if (all_users_res.users && Array.isArray(all_users_res.users)) {
      const sorted = all_users_res.users.sort((a: any, b: any) => b.total_executions - a.total_executions)
      const rank   = sorted.findIndex((u: any) => u.discord_id === member.id) + 1
      
      if (rank > 0) {
        leaderboard_text = `You are #${rank} of ${sorted.length} users`
      } else {
        leaderboard_text = `Not ranked yet (${sorted.length} total users)`
      }
    }

    const hwid_status   = user.identifier ? "Assigned" : "Not Assigned"
    const last_reset_ts = user.last_reset > 0 ? `<t:${user.last_reset}:R>` : "Never"
    const expires_text  = user.auth_expire === -1 ? "Never" : `<t:${user.auth_expire}:R>`
    const banned_text   = user.banned === 1 ? `Yes - ${user.ban_reason || "No reason"}` : "No"
    const note_text     = user.note || "Not specified"

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Your Script Statistics`,
                `${leaderboard_text}`,
                ``,
                `- **Total Executions:** ${user.total_executions}`,
                `- **HWID Status:** ${hwid_status}`,
                `- **Key:** ||${user.user_key}||`,
                `- **Total HWID Resets:** ${user.total_resets}`,
                `- **Last Reset:** ${last_reset_ts}`,
                `- **Expires At:** ${expires_text}`,
                `- **Banned:** ${banned_text}`,
                `- **Note:** ${note_text}`,
              ],
              thumbnail : format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (error) {
    __log.error("Failed to get stats:", error)

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
