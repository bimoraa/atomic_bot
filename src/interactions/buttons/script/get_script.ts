import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor                     from "../../../functions/luarmor"
import { component, api, format, modal } from "../../../utils"

export async function handle_get_script(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

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

    await interaction.showModal(redeem_modal)
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const loader_script = luarmor.get_full_loader_script(user_result.data.user_key)

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Your Loader Script`,
              `Copy and paste this script into your executor:`,
              ``,
              `\`\`\`lua`,
              loader_script,
              `\`\`\``,
              ``,
              `-# Keep your key private! Do not share it with anyone.`,
            ],
            thumbnail: format.logo_url,
          }),
          component.action_row(
            component.secondary_button("Mobile Copy", "script_mobile_copy"),
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
}

export async function handle_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  const user_result = await luarmor.get_user_by_discord(member.id)

  if (!user_result.success || !user_result.data) {
    await interaction.reply({
      content   : "You don't have a key linked to your Discord account.",
      ephemeral : true,
    })
    return
  }

  const loader_script = luarmor.get_full_loader_script(user_result.data.user_key)
  const mobile_copy   = loader_script.replace(/\n/g, " ")

  await interaction.reply({
    content   : `\`${mobile_copy}\``,
    ephemeral : true,
  })
}
