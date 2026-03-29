/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /track-account 斜杠命令，查看指定游戏的账户追踪器 - \\
// - /track-account slash command, view account tracker for a specific game - \\
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                           from "discord.js"
import { Command }          from "@shared/types/command"
import { component }        from "@shared/utils"
import { log_error }        from "@shared/utils/error_logger"
import { get_all_sessions } from "@shared/database/managers/account_tracker.manager"
import type { account_tracker_session } from "@models/account_tracker.model"

// - 全局固定键，session 不区分 guild - \\
// - fixed global key, sessions are not scoped per guild - \\
const __global_key = "global"

// - 支持的游戏列表 - \\
// - supported game list - \\
const __game_cdid  = "CDID"

/**
 * @description build ephemeral tracker overview message for a guild
 * @param sessions - list of active account sessions
 * @param guild_id - guild ID used as select menu custom_id suffix
 * @returns Component V2 message payload
 */
function build_tracker_message(sessions: account_tracker_session[], guild_id: string) {
  const total        = sessions.length
  const inner: any[] = [component.text(`- Total Account: ${total}`)]

  // - 有账户时才挂载选择菜单 - \\
  // - only attach select menu when sessions exist - \\
  if (total > 0) {
    inner.push(
      component.select_menu(
        `account_tracker_select:${guild_id}`,
        "Select an account to view details...",
        sessions.map((s) => ({
          label       : s.username.substring(0, 100),
          value       : s.key_hash,
          description : s.status.substring(0, 100),
        })),
      ),
    )
  }

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Car Driving Indonesia  - Account Tracker"),
        ],
      }),
      component.container({ components: inner }),
    ],
  })
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("track-account")
    .setDescription("View the account tracker for a supported game")
    .addStringOption((opt) =>
      opt
        .setName("game")
        .setDescription("Game to track")
        .setRequired(true)
        .addChoices({ name: "Car Driving Indonesia", value: __game_cdid }),
    ),

  /**
   * @description execute /track-account command — ephemeral, all users
   * @param interaction - discord chat input interaction
   * @returns Promise<void>
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild_id = interaction.guildId
    const client   = interaction.client

    if (!guild_id) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("This command can only be used in a server.")],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    try {
      await interaction.deferReply({ ephemeral: true })

      const sessions = await get_all_sessions(__global_key)
      await interaction.editReply(build_tracker_message(sessions, __global_key))
    } catch (err) {
      await log_error(client, err as Error, "Track Account Command", {
        user_id  : interaction.user.id,
        guild_id,
      }).catch(() => {})
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({
                components: [component.text("Failed to load tracker. Please try again.")],
              }),
            ],
          }),
          ephemeral: true,
        }).catch(() => {})
      }
    }
  },
}

