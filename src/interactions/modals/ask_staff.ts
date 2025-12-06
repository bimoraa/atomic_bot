import {
  ModalSubmitInteraction,
  TextChannel,
} from "discord.js"
import { component, api } from "../../utils"
import { build_question_panel, ask_channel_id } from "../../commands/tools/ask"

export async function handle_ask_staff_modal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const question    = interaction.fields.getTextInputValue("question")
  const user        = interaction.user
  const user_avatar = user.displayAvatarURL({ extension: "png", size: 128 })

  const channel = interaction.client.channels.cache.get(ask_channel_id) as TextChannel
  if (!channel) {
    await interaction.editReply({ content: "Ask channel not found." })
    return
  }

  const message = build_question_panel(user.id, user_avatar, question)
  const response = await api.send_components_v2(
    ask_channel_id,
    api.get_token(),
    message
  )

  if (response.error) {
    console.log("[ask_modal] API Error:", JSON.stringify(response, null, 2))
    await interaction.editReply({ content: "Failed to send your question." })
    return
  }

  const sent_message = await channel.messages.fetch(response.id as string)
  const thread = await sent_message.startThread({
    name: `Answer - ${user.username}`,
    autoArchiveDuration: 1440,
  })

  await thread.send({
    content: `<@${user.id}> Staff will answer your question here.`,
  })

  await interaction.editReply({ content: `Your question has been sent! Check <#${thread.id}>` })
}
