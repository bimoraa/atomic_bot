import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format, modal } from "../../../../shared/utils"
import { get_user_script } from "../../controllers/service_provider_controller"
import * as luarmor from "../../../../infrastructure/api/luarmor"

export async function handle_get_script(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  await interaction.deferReply({ ephemeral: true })

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

      await interaction.followUp({ content: "Please redeem your key first.", ephemeral: true })
      return
    }

    const error_message = component.build_message({
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
    })

    await api.edit_deferred_reply(interaction, error_message)
    return
  }

  const loader_script = script_result.script!

  const message = component.build_message({
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
  })

  await api.edit_deferred_reply(interaction, message)
}

export async function handle_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  const script_result = await get_user_script({ client: interaction.client, user_id: member.id })

  if (!script_result.success) {
    if (script_result.message) {
      await interaction.reply({ ...script_result.message, ephemeral: true })
      return
    }
    await interaction.reply({
      content   : `## Error\n${script_result.error}`,
      ephemeral : true,
    })
    return
  }

  const loader_script = script_result.script!
  const mobile_copy   = loader_script.replace(/\n/g, " ")

  await interaction.reply({
    content   : `\`${mobile_copy}\``,
    ephemeral : true,
  })
}
