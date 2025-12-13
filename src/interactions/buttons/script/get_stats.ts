import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor              from "../../../functions/luarmor"
import { component, api, format } from "../../../utils"

export async function handle_get_stats(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  const user_result = await luarmor.get_user_by_discord(member.id)

  if (!user_result.success || !user_result.data) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## No Key Found`,
                `You don't have a key linked to your Discord account.`,
                ``,
                `Please use the **Redeem Key** button first to link your key.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return
  }

  const user = user_result.data

  const all_users_result = await luarmor.get_all_users()
  let leaderboard_text   = "Unable to fetch leaderboard"

  if (all_users_result.success && all_users_result.data) {
    const rank_info = luarmor.get_execution_rank(all_users_result.data, member.id)
    if (rank_info.rank > 0) {
      leaderboard_text = `You are #${rank_info.rank} of ${rank_info.total} users`
    } else {
      leaderboard_text = `Not ranked yet (${all_users_result.data.length} total users)`
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
            thumbnail: format.logo_url,
          }),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
}
