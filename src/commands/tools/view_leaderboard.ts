import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                               from "discord.js"
import { Command }              from "../../types/command"
import { is_admin }             from "../../functions/permissions"
import * as luarmor             from "../../functions/luarmor"
import { component, api, format } from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("view_leaderboard")
    .setDescription("View script execution leaderboard")
    .addIntegerOption(option =>
      option
        .setName("page")
        .setDescription("Page number (10 users per page)")
        .setRequired(false)
        .setMinValue(1)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content   : "You don't have permission to use this command.",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const page           = interaction.options.getInteger("page") || 1
    const users_per_page = 10

    const users_result = await luarmor.get_all_users()

    if (!users_result.success || !users_result.data) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Failed to Load Leaderboard`,
                  `Could not fetch user data from Luarmor.`,
                  ``,
                  `**Error:** ${users_result.error || "Unknown error"}`,
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

    const sorted_users = [...users_result.data].sort(
      (a, b) => b.total_executions - a.total_executions
    )

    const total_users = sorted_users.length
    const total_pages = Math.ceil(total_users / users_per_page)
    const safe_page   = Math.min(Math.max(1, page), total_pages || 1)

    const start_index = (safe_page - 1) * users_per_page
    const end_index   = start_index + users_per_page
    const page_users  = sorted_users.slice(start_index, end_index)

    const leaderboard_lines: string[] = []

    for (let i = 0; i < page_users.length; i++) {
      const user     = page_users[i]
      const rank     = start_index + i + 1
      const user_tag = user.discord_id ? `<@${user.discord_id}>` : `\`${user.user_key.slice(0, 8)}...\``

      leaderboard_lines.push(
        `${rank}. ${user_tag} has executed the **${user.total_executions} times**`
      )
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Execution Leaderboard`,
                `Total users: **${total_users}**`,
              ],
              thumbnail: format.logo_url,
            }),
            component.divider(),
            component.text([
              ...leaderboard_lines,
            ]),
            component.divider(),
            component.text([
              `-# Page ${safe_page} of ${total_pages}`,
            ]),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  },
}
