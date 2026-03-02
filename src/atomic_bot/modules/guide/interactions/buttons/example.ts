// - 指南示例按钮的交互注册 - \
// - registers the guide example button interaction - \
import { ButtonInteraction } from "discord.js"
import { guide_buttons }     from "../../../../modules/setup/commands/guide_panel"
import { api, component }    from "@shared/utils"
import { ButtonHandler }     from "@shared/types/interaction"

export async function handle_guide_button(interaction: ButtonInteraction) {
  const parts = interaction.customId.split("_")
  const guide_type = parts[2]
  const button_idx = parseInt(parts[3])

  const buttons = guide_buttons.get(guide_type)

  if (!buttons || !buttons[button_idx]) {
    await interaction.reply({
      content: "Button content tidak ditemukan.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(buttons[button_idx].content),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
}

export const button: ButtonHandler = {
  custom_id: /^guide_btn_/,
  execute: handle_guide_button,
}
