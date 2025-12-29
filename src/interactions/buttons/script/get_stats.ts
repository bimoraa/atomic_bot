import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format } from "../../../utils"
import { get_user_stats }         from "../../controller/service_provider_controller"

export async function handle_get_stats(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  const stats_result = await get_user_stats({ client: interaction.client, user_id: member.id })

  if (!stats_result.success) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Error`,
                `${stats_result.error}`,
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

  const user             = stats_result.data.user
  const leaderboard_text = stats_result.data.leaderboard_text

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
