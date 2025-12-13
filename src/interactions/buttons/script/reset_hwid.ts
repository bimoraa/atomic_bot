import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor              from "../../../functions/luarmor"
import { component, api, format } from "../../../utils"

export async function handle_reset_hwid(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  const user_result = await luarmor.get_user_by_discord(member.id)

  if (!user_result.success || !user_result.data) {
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
