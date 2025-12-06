import { ButtonInteraction, TextChannel } from "discord.js"
import { component, api } from "../../../utils"
import { 
  ask_channel_id, 
  create_thread_for_message,
  build_question_panel_no_answer 
} from "../../../commands/tools/ask"

function extract_question_data(interaction: ButtonInteraction): {
  user_id: string
  question: string
  timestamp: number
  user_avatar: string
} | null {
  const message = interaction.message
  
  const content = JSON.stringify(message.components)
  
  const user_match = content.match(/Question from <@(\d+)>/)
  const user_id    = user_match?.[1] ?? ""
  
  const question_match = content.match(/Question: ([^"]+)/)
  const question       = question_match?.[1]?.replace(/\\n/g, "\n").trim() ?? ""
  
  const timestamp_match = content.match(/<t:(\d+):F>/)
  const timestamp       = timestamp_match?.[1] ? parseInt(timestamp_match[1]) : Math.floor(Date.now() / 1000)

  const thumbnail_match = content.match(/"url":"([^"]+)"/)
  const user_avatar     = thumbnail_match?.[1] ?? ""

  if (!user_id) return null

  return { user_id, question, timestamp, user_avatar }
}

export async function handle_ask_answer(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferUpdate()

  const message = interaction.message
  
  if (message.thread) {
    return
  }

  const channel = interaction.client.channels.cache.get(ask_channel_id) as TextChannel
  if (!channel) return

  const data = extract_question_data(interaction)
  if (!data) {
    return
  }

  const user = await interaction.client.users.fetch(data.user_id).catch(() => null)
  const username = user?.username ?? "Unknown"

  const thread_id = await create_thread_for_message(
    channel,
    message.id,
    data.user_id,
    username
  )

  if (thread_id) {
    const updated_message = build_question_panel_no_answer(
      data.user_id,
      data.user_avatar,
      data.question,
      data.timestamp
    )

    await api.edit_components_v2(
      ask_channel_id,
      message.id,
      api.get_token(),
      updated_message
    )
  }
}
