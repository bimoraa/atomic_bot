/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「查看数据」按钮处理 - \\
// - get stats button handler for the scripts panel - \\

import { ButtonInteraction, GuildMember } from "discord.js"
import { log_error }                       from "@utils/error_logger"
import { component, api, format }          from "@utils"
import { get_user_stats }                  from "@commands/commerce/service-provider/controller/service_provider.controller"

/**
 * @description handles the get stats button — fetches Luarmor user stats and displays them.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_get_stats(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  try {
    const member = interaction.member as GuildMember

    const stats_result = await get_user_stats({ client: interaction.client, user_id: member.id })

    if (!stats_result.success) {
      if (stats_result.message) {
        await api.edit_deferred_reply(interaction, stats_result.message)
        return
      }

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content  : [
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
            component.text("## Your Script Statistics\n"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Total Executions: **${user.total_executions}**`,
              `- HWID Status: **${hwid_status}**`,
              `- Key: ||${user.user_key}||`,
              `- Total HWID Resets: **${user.total_resets}**`,
              `- Last Reset: **${last_reset_ts}**`,
              `- Expires At: **${expires_text}**`,
              `- Banned: **${banned_text}**`,
              `- Note: **${note_text}**`,
            ]),
            component.divider(2),
            component.section({
              content  : `${leaderboard_text}\n`,
              accessory: component.secondary_button("View Execution Leaderboard", "script_view_leaderboard"),
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Get Stats", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
