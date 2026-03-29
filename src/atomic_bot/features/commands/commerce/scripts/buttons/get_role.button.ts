/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板「获取角色」按鈕处理 - \\
// - get script role button handler for the scripts panel - \\

import { ButtonInteraction, GuildMember } from "discord.js"
import { log_error }                       from "@shared/utils/error_logger"
import * as luarmor                        from "@atomic/integrations/api/luarmor"
import { component, api, env, format }     from "@shared/utils"
import { member_has_role }                 from "@shared/utils/discord_api"
import { is_quarantined }                  from "@shared/database/managers/quarantine.manager"

const __script_role_id = env.get("LUARMOR_SCRIPT_ROLE_ID", "1398313779380617459")

/**
 * @description handles the get script role button — verifies Luarmor key then assigns the script role.
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_get_role(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  try {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild!

    // - 被隔离的用户不能领取角色 - \\
    // - quarantined users cannot receive the script role - \\
    const quarantined = await is_quarantined(member.id, guild.id)
    if (quarantined) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Access Denied`,
                  `You are currently quarantined and cannot receive roles.`,
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

    const user_result = await luarmor.get_user_by_discord(member.id)

    if (!user_result.success || !user_result.data) {
      if (user_result.is_error) {
        const message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: [
                    `## Error`,
                    `${user_result.error}`,
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

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## No Key Found`,
                  `You don't have a key linked to your Discord account.`,
                  ``,
                  `Please use the **Redeem Key** button first to link your key.`,
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

    const role = await guild.roles.fetch(__script_role_id).catch(() => null)
    if (!role) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Role Not Found`,
                  `The script role could not be found. Please contact an administrator.`,
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

    if (member_has_role(member, __script_role_id)) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Already Have Role`,
                  `You already have the <@&${__script_role_id}> role!`,
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

    try {
      await member.roles.add(role)

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Role Added`,
                  `You have been given the <@&${__script_role_id}> role!`,
                  ``,
                  `You now have access to script-related channels.`,
                ],
                thumbnail: format.logo_url,
              }),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, message)
    } catch (role_err) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Failed to Add Role`,
                  `Could not add the role. Please contact an administrator.`,
                ],
                thumbnail: format.logo_url,
              }),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, message)
    }
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Get Role", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
