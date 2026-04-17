/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 建议投票按钮处理器 - \\
// - suggestion upvote button handler - \\
import { ButtonInteraction }     from "discord.js"
import { component }             from "@utils"
import { log_error }             from "@utils/error_logger"
import { find_suggestion }       from "@managers/suggestion.manager"
import {
  handle_upvote,
  update_vote_message,
}                                from "@commands/server-util/suggest-feature/controller/suggest_feature.controller"

/**
 * @description handle the upvote button interaction — toggles vote on/off
 * @param interaction - button interaction
 * @returns void
 */
export async function handle_suggest_upvote(interaction: ButtonInteraction): Promise<void> {
  try {
    const suggestion_id = interaction.customId.replace("suggest_upvote:", "")
    const user_id       = interaction.user.id

    const result = await handle_upvote(interaction.client, suggestion_id, user_id)

    if (!result.success) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text(result.error || "Failed to process vote.")],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    const suggestion = await find_suggestion(suggestion_id)

    if (suggestion) {
      await update_vote_message(interaction.client, suggestion, result.vote_count)
    }

    const status_text = result.voted
      ? "Your upvote has been recorded."
      : "Your upvote has been removed."

    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components: [component.text(status_text)],
          }),
        ],
      }),
      ephemeral: true,
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "Suggest Feature - Upvote Button", {
      user_id   : interaction.user.id,
      custom_id : interaction.customId,
    }).catch(() => {})

    if (!interaction.replied) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("An error occurred while processing your vote.")],
            }),
          ],
        }),
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
