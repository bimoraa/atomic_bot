/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - account tracker 选择菜单，显示单个账户的详情 - \\
// - account tracker select menu, shows detail card for a selected account - \\
import { StringSelectMenuInteraction }  from "discord.js"
import { component }                    from "@utils"
import { log_error }                    from "@utils/error_logger"
import { get_session_by_hash }          from "@managers/account_tracker.manager"
import { build_detail_message }         from "@http/routes/account_tracker.api"

// - 全局固定键，sessions 不区分 guild - \\
// - fixed global key, sessions are not scoped per guild - \\
const __global_key = "global"

/**
 * @description handle account_tracker_select:<guild_id> select menu interaction
 * @param interaction - discord string select menu interaction
 * @returns Promise<void>
 */
export async function handle_account_tracker_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const key_hash  = interaction.values[0]
  const client    = interaction.client

  try {
    // - 占位选项被选中时忽略 - \\
    // - ignore the placeholder "none" option - \\
    if (key_hash === "none") {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("No accounts are being tracked yet.")],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    const session = await get_session_by_hash(__global_key, key_hash)
    if (!session) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("Account not found. It may have been removed.")],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    await interaction.reply({
      ...build_detail_message(session),
      ephemeral: true,
    })
  } catch (err) {
    await log_error(client, err as Error, "Account Tracker Select Menu", {
      user_id : interaction.user.id,
    }).catch(() => {})
    if (!interaction.replied) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("Failed to load account details. Please try again.")],
            }),
          ],
        }),
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
