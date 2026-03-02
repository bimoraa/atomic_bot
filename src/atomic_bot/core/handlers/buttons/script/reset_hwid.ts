import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format }             from "@shared/utils"
import { reset_user_hwid }                    from "../../controllers/service_provider_controller"
import { is_hwid_enabled }                    from "../../../../modules/setup/hwid_control"

export async function handle_reset_hwid(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const hwid_enabled = await is_hwid_enabled()
  if (!hwid_enabled) {
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("#ED4245"),
          components  : [
            component.text([
              "## HWID Reset Disabled",
              "HWID reset functionality is currently disabled.",
              "",
              "Please contact an administrator for assistance.",
            ]),
          ],
        }),
      ],
    }))
    return
  }

  const member = interaction.member as GuildMember

  const reset_result = await reset_user_hwid({ client: interaction.client, user_id: member.id })

  if (reset_result.success) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("## HWID Reset Successful\nYour hardware ID has been reset successfully!"),
            component.divider(2),
            component.section({
              content: "You can now use the script on a new device.",
              accessory: component.secondary_button("View Stats", "script_get_stats"),
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } else {
    if (reset_result.message && typeof reset_result.message === 'object') {
      await api.edit_deferred_reply(interaction, reset_result.message)
      return
    }

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
