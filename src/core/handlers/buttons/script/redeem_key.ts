import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor                     from "../../../../infrastructure/api/luarmor"
import { component, api, format, modal } from "../../../../shared/utils"

export async function handle_redeem_key(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  const existing_user = await luarmor.get_user_by_discord(member.id)
  
  if (existing_user.success && existing_user.data) {
    await interaction.deferReply({ ephemeral: true })

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
      custom_id   : "user_key",
      label       : "Enter Your Key",
      placeholder : "Paste your key here...",
      required    : true,
      min_length  : 30,
      max_length  : 100,
    }),
  )

  await interaction.showModal(redeem_modal)
}
