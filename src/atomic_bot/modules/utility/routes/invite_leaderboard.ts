/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /invite-leaderboard 斜杠命令，查看邀请排行榜 - \
// - /invite-leaderboard slash command, shows the invite leaderboard - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                           from "@shared/types/command"
import { api, component, db }                                from "@shared/utils"
import { log_error }                                         from "@shared/utils/error_logger"

const __invite_leaderboard_collection = "invite_leaderboard"

interface invite_leaderboard_record {
  guild_id     : string
  inviter_id   : string
  inviter_tag  : string
  total_invite : number
}

/**
 * - 执行邀请排行榜命令 - \\
 * - execute invite leaderboard command - \\
 * @param {ChatInputCommandInteraction} interaction - command interaction
 * @returns {Promise<void>} void
 */
async function execute_invite_leaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: false })

  try {
    const guild_id = interaction.guildId
    if (!guild_id) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Guild not found"),
            ],
          }),
        ],
      }))
      return
    }

    const records = await db.find_many<invite_leaderboard_record>(__invite_leaderboard_collection, { guild_id: guild_id })
    if (records.length === 0) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("## Invite Leaderboard"),
            ],
          }),
          component.container({
            components : [
              component.text("No invite data found."),
            ],
          }),
        ],
      }))
      return
    }

    const sorted = [...records].sort((a, b) => b.total_invite - a.total_invite)
    const lines = sorted.slice(0, 10).map((record, index) => {
      return `${index + 1}. <@${record.inviter_id}> - ${record.total_invite} invites`
    })

    const payload = component.build_message({
      components : [
        component.container({
          components : [
            component.text("## Invite Leaderboard"),
          ],
        }),
        component.container({
          components : [
            component.text(lines),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, payload)
  } catch (error) {
    await log_error(interaction.client, error as Error, "invite_leaderboard_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to load invite leaderboard"),
          ],
        }),
      ],
    }))
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("invite-leaderboard")
    .setDescription("Show invite leaderboard") as SlashCommandBuilder,
  execute : execute_invite_leaderboard,
}
