/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「兑换 Key」按钮处理 - \\
// - redeem key button handler for the scripts panel - \\

import { ButtonInteraction, GuildMember } from "discord.js"
import { log_error }                       from "@utils/error_logger"
import * as luarmor                        from "@integrations/api/luarmor"
import { component, api, format, modal }   from "@utils"

/**
 * @description handles the redeem key button — shows existing key info or opens redeem modal.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_redeem_key(interaction: ButtonInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    const existing_user = await luarmor.get_user_by_discord(member.id)

    if (existing_user.success && existing_user.data) {
      await interaction.deferReply({ flags: 64 })

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Already Registered`,
                  `You already have a key linked to your Discord account.`,
                  ``,
                  `- **Your Key:** \`${existing_user.data.user_key}\``,
                  `- **Total Executions:** ${existing_user.data.total_executions}`,
                  ``,
                  `Use the **Get Script** button to get your loader script.`,
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

    const redeem_modal = modal.create_modal(
      "script_redeem_modal",
      "Redeem Your Key",
      modal.create_text_input({
        custom_id  : "user_key",
        label      : "Enter Your Key",
        placeholder: "Paste your key here...",
        required   : true,
        min_length : 30,
        max_length : 100,
      }),
    )

    await interaction.showModal(redeem_modal)
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Redeem Key", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
