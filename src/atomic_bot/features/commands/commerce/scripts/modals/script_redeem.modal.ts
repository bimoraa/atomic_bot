/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理脚本兑换 modal 的提交 - \\
// - handles the script redeem modal submission - \\

import { ModalSubmitInteraction, GuildMember } from "discord.js"
import { log_error }                            from "@utils/error_logger"
import { component, api, env, format }          from "@utils"
import { member_has_role }                      from "@utils/discord_api"
import { redeem_user_key }                      from "@commands/commerce/service-provider/controller/service_provider.controller"
import { is_quarantined }                       from "@managers/quarantine.manager"

const __script_role_id = env.get("LUARMOR_SCRIPT_ROLE_ID", "1398313779380617459")

/**
 * @description handles the script redeem modal — validates key, links Discord account, and assigns role.
 * @param {ModalSubmitInteraction} interaction - discord modal submit interaction
 * @returns {Promise<boolean>} returns true if this modal was handled
 */
export async function handle_script_redeem_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "script_redeem_modal") return false

  await interaction.deferReply({ flags: 64 })

  const member   = interaction.member as GuildMember
  const user_key = interaction.fields.getTextInputValue("user_key").trim()

  // - 被隔离的用户不能领取角色 - \\
  // - quarantined users cannot redeem keys or receive roles - \\
  const quarantined = await is_quarantined(member.id, interaction.guildId!)
  if (quarantined) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Access Denied`,
              `You are currently quarantined and cannot redeem keys.`,
            ]),
          ],
        }),
      ],
    })
    await api.edit_deferred_reply(interaction, message)
    return true
  }

  const result = await redeem_user_key({ client: interaction.client, user_id: member.id, user_key })

  if (!result.success) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Error`,
              `${result.error}`,
            ]),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return true
  }

  try {
    const guild = interaction.guild!
    const role  = await guild.roles.fetch(__script_role_id).catch(() => null)
    if (role && !member_has_role(member as any, __script_role_id)) {
      await member.roles.add(role)
    }
  } catch (err) {
    await log_error(interaction.client, err as Error, "Script Redeem Modal - Role Assign", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? undefined,
    }).catch(() => {})
  }

  const loader_script = result.script!

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Key Redeemed Successfully!`,
            `Your key has been linked to your Discord account.`,
          ]),
        ],
      }),
      component.container({
        components: [
          component.text([
            `### Your Loader Script:`,
          ]),
          component.divider(),
          component.text([
            `\`\`\`lua`,
            loader_script,
            `\`\`\``,
          ]),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.secondary_button("Mobile Copy", "mobile_copy"),
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
  return true
}
