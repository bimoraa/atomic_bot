/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /suggest-feature 斜杠命令，生成建议表单链接 - \\
// - /suggest-feature slash command, generates a suggestion form link - \\
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@utils"
import { log_error }                                        from "@utils/error_logger"
import {
  generate_suggestion_token,
  get_suggestion_url,
}                                                           from "@commands/server-util/suggest-feature/controller/suggest_feature.controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("suggest-feature")
    .setDescription("Suggest a new feature or game support for the bot")
    .setDMPermission(false),

  /**
   * @description generate a suggestion token and reply with the web form link
   * @param interaction - slash command interaction
   * @returns void
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ flags: 64 })

      const user_id  = interaction.user.id
      const guild_id = interaction.guildId

      if (!guild_id) {
        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                components: [component.text("This command can only be used in a server.")],
              }),
            ],
          })
        )
        return
      }

      const token = await generate_suggestion_token(user_id, guild_id)
      const url   = get_suggestion_url(token)

      await interaction.editReply(
        component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Suggest a Feature",
                  "Click the button below to fill out the suggestion form.",
                  "You can suggest a new feature or request game support.",
                ]),
                component.action_row(
                  component.link_button("Open Suggestion Form", url),
                ),
              ],
            }),
          ],
        })
      )

      console.log(`[ - SUGGEST FEATURE - ] token generated for ${interaction.user.tag}: ${token}`)
    } catch (err) {
      await log_error(interaction.client, err as Error, "Suggest Feature Command", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId,
      }).catch(() => {})

      if (interaction.deferred) {
        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                components: [component.text("An error occurred while generating the suggestion form.")],
              }),
            ],
          })
        ).catch(() => {})
      }
    }
  },
}
