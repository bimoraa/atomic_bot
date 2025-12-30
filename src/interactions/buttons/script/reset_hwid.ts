import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format }             from "../../../utils"
import { reset_user_hwid }                    from "../../controllers/service_provider_controller"

export async function handle_reset_hwid(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember

  const reset_result = await reset_user_hwid({ client: interaction.client, user_id: member.id })

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
