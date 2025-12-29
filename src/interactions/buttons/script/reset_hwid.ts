import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor                           from "../../../functions/luarmor"
import { component, api, format }             from "../../../utils"
import { log_error }                          from "../../../utils/error_logger"
import { check_reset_cooldown }               from "../../controller/service_provider_controller"

export async function handle_reset_hwid(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  try {
    const cooldown = await check_reset_cooldown({ client: interaction.client, user_id: member.id })

    if (!cooldown.allowed) {
      const remaining_seconds = Math.ceil((cooldown.remaining_ms || 0) / 1000)

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Cooldown Active`,
                  `Please wait ${remaining_seconds} seconds before resetting again.`,
                  `-# Rate limit protection is enabled.`,
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
  } catch (cooldown_error) {
    await log_error(interaction.client, cooldown_error as Error, "script_reset_hwid_cooldown", {
      user_id: member.id,
    })
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

  const reset_result = await luarmor.reset_hwid_by_key(user_result.data.user_key)

  if (reset_result.success) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## HWID Reset Successful`,
                `Your hardware ID has been reset successfully!`,
                ``,
                `You can now use the script on a new device.`,
                ``,
                `-# Note: You can only reset your HWID a limited number of times.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } else {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## HWID Reset Failed`,
                `Could not reset your hardware ID.`,
                `**Reason:** ${reset_result.error || "Unknown error"}`,
                `Please try again later or contact support.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  }
}
