/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 建议功能按钮处理器，生成表单链接 - \\
// - suggest feature button handler, generates form link - \\
import { ButtonInteraction } from "discord.js"
import { component }         from "@utils"
import { log_error }         from "@utils/error_logger"
import {
  generate_suggestion_token,
  get_suggestion_url,
}                            from "@commands/server-util/suggest-feature/controller/suggest_feature.controller"

/**
 * @description handle the suggest feature button — generates a new form link
 * @param interaction - button interaction
 * @returns void
 */
export async function handle_suggest_feature(interaction: ButtonInteraction): Promise<void> {
  try {
    const user_id  = interaction.user.id
    const guild_id = interaction.guildId

    if (!guild_id) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("This can only be used in a server.")],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    const token = await generate_suggestion_token(user_id, guild_id)
    const url   = get_suggestion_url(token)

    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Suggest a Feature",
                "Click the button below to fill out the suggestion form.",
                "We recommend using the web form for the best experience.",
              ]),
              component.action_row(
                component.link_button("Open Suggestion Form", url),
              ),
            ],
          }),
        ],
      }),
      ephemeral: true,
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "Suggest Feature Button", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId,
    }).catch(() => {})

    if (!interaction.replied) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [component.text("An error occurred. Please try again later.")],
            }),
          ],
        }),
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
