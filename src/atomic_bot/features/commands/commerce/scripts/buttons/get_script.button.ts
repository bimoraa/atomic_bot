/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「获取脚本」与「移动端复制」按钮处理 - \\
// - get script and mobile copy button handlers for the scripts panel - \\

import { ButtonInteraction, GuildMember }  from "discord.js"
import { component, api, format, modal }   from "@utils"
import { log_error }                       from "@utils/error_logger"
import { get_user_script }                 from "@commands/commerce/service-provider/controller/service_provider.controller"
import * as luarmor                        from "@integrations/api/luarmor"

/**
 * @description handles the get script button — retrieves and displays the user's loader script.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_get_script(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  await interaction.deferReply({ flags: 64 })

  try {
    const script_result = await get_user_script({ client: interaction.client, user_id: member.id })

    if (!script_result.success) {
      if (script_result.message) {
        await api.edit_deferred_reply(interaction, script_result.message)
        return
      }

      const user_result = await luarmor.get_user_by_discord(member.id)

      if (!user_result.success || !user_result.data) {
        const redeem_modal = modal.create_modal(
          "script_redeem_modal",
          "Redeem Your Key",
          modal.create_text_input({
            custom_id   : "user_key",
            label       : "Enter Your Key",
            placeholder : "Paste your key here...",
            required    : true,
            min_length  : 30,
            max_length  : 100,
          }),
        )

        await interaction.followUp({ ...component.build_message({
          components: [component.container({ components: [component.text("Please redeem your key first using the Redeem Key button.")] })],
        }), ephemeral: true })
        return
      }

      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## Error`,
                `${script_result.error}`,
              ]),
            ],
          }),
        ],
      }))
      return
    }

    const loader_script = script_result.script!

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Loader Script`,
              `Copy and paste this script into your executor:`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              `\`\`\`lua`,
              loader_script,
              `\`\`\``,
            ]),
            component.divider(2),
            component.text("-# Dont share your key or script with anyone else"),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Mobile Copy", "script_mobile_copy"),
            ),
          ],
        }),
      ],
    }))
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Get Script", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}

/**
 * @description handles the mobile copy button — provides a minified single-line loader script.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  await interaction.deferReply({ flags: 64 })

  try {
    const script_result = await get_user_script({ client: interaction.client, user_id: member.id })

    if (!script_result.success) {
      if (script_result.message) {
        await api.edit_deferred_reply(interaction, script_result.message)
        return
      }

      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## Error`,
                `${script_result.error}`,
              ]),
            ],
          }),
        ],
      }))
      return
    }

    const loader_script = script_result.script!
    const mobile_copy   = loader_script.replace(/\n/g, " ")

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Mobile Copy`,
              `\`${mobile_copy}\``,
            ]),
          ],
        }),
      ],
    }))
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Mobile Copy", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
