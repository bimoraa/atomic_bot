import { ModalSubmitInteraction } from "discord.js"
import { component, api, format } from "@shared/utils"

const rules_channel_id = "1250373760016715866"

function build_rules_message(header: string, rules: string, footer: string) {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Server Rules`,
              header,
            ],
            thumbnail: format.logo_url,
          }),
          component.divider(),
          component.text(rules.split("\n")),
          component.divider(),
          component.text(footer.split("\n")),
        ],
      }),
    ],
  })
}

export async function handle_edit_rules_modal(interaction: ModalSubmitInteraction): Promise<void> {
  const message_id = interaction.customId.split(":")[1]

  const header = interaction.fields.getTextInputValue("header")
  const rules  = interaction.fields.getTextInputValue("rules")
  const footer = interaction.fields.getTextInputValue("footer")

  await interaction.deferReply({ ephemeral: true })

  const message  = build_rules_message(header, rules, footer)
  const response = await api.edit_components_v2(rules_channel_id, message_id, api.get_token(), message)

  if (!response.error) {
    await interaction.editReply({ content: "Rules message updated successfully!" })
  } else {
    await interaction.editReply({ content: "Failed to update rules message. Make sure the message ID is correct." })
  }
}
