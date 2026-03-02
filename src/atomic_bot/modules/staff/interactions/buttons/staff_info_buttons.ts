// - 员工信息按钮组件的定义和构建 - \
// - button component definitions for staff info - \
import { ButtonInteraction } from "discord.js"
import { ButtonHandler }     from "@shared/types/interaction"
import { component, api }   from "@shared/utils"
import {
  get_staff_info_document,
  custom_id_to_file_name,
} from "@shared/utils/staff_info_parser"

export const button: ButtonHandler = {
  custom_id: /^staff_info_/,
  async execute(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: 64 })

    const file_name = custom_id_to_file_name(interaction.customId)
    const doc       = await get_staff_info_document(file_name)

    if (!doc) {
      await interaction.editReply({
        content: "Document not found. Please contact an administrator.",
      })
      return
    }

    const last_update_text = doc.metadata.last_update
      ? `\n\n*Last updated: <t:${doc.metadata.last_update}:R>*`
      : ""

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## ${doc.metadata.title}`),
            component.divider(2),
            component.text(doc.content + last_update_text),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  },
}
