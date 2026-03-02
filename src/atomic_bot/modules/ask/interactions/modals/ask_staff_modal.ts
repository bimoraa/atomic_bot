// - 处理 ask staff modal 提交的逻辑 - \
// - handles the ask staff modal submission - \
// - 提问员工模态框处理器 - \
// - ask staff modal handler - \

import { ModalSubmitInteraction } from "discord.js"
import { post_question }          from "@atomic/modules/ask/controller"
import { ask_channel_id }         from "@atomic/modules/ask/commands/ask"

export async function handle_ask_staff_modal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const question    = interaction.fields.getTextInputValue("question")
  const user        = interaction.user
  const user_avatar = user.displayAvatarURL({ extension: "png", size: 128 })

  const result = await post_question({
    client       : interaction.client,
    user_id      : user.id,
    user_avatar,
    question,
    channel_id   : ask_channel_id,
    show_buttons : true,
  })

  if (result.success) {
    await interaction.editReply({ 
      content: "Your question has been sent! Staff can click 'Answer' to create a thread." 
    })
  } else {
    await interaction.editReply({ content: result.error || "Failed to send your question." })
  }
}
