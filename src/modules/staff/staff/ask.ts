import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ChannelType,
} from "discord.js"
import { Command }                      from "../../../shared/types/command"
import { component, api }               from "../../../shared/utils"
import { build_question_panel as build_panel } from "../../../core/handlers/controllers/ask_controller"

export const ask_channel_id = "1250786601462923396"

export function build_question_panel(
  user_id             : string,
  user_avatar         : string,
  question            : string,
  show_answer_button  : boolean = false
): component.message_payload {
  const timestamp = Math.floor(Date.now() / 1000)

  const buttons = [
    component.primary_button("Ask a Staff", "ask_staff_button"),
  ]

  if (show_answer_button) {
    buttons.push(component.secondary_button("Answer", `ask_answer_${user_id}`))
  }

  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Question from <@${user_id}>`,
              `Date: <t:${timestamp}:F>`,
              `Question: ${question}`,
            ],
            thumbnail: user_avatar,
          }),
          component.action_row(...buttons),
        ],
      }),
    ],
  })
}

export function build_question_panel_no_answer(
  user_id: string,
  user_avatar: string,
  question: string,
  timestamp: number
): component.message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Question from <@${user_id}>`,
              `Date: <t:${timestamp}:F>`,
              `Question: ${question}`,
            ],
            thumbnail: user_avatar,
          }),
          component.action_row(
            component.primary_button("Ask a Staff", "ask_staff_button")
          ),
        ],
      }),
    ],
  })
}

export async function create_thread_for_message(
  channel: TextChannel,
  message_id: string,
  user_id: string,
  username: string,
  retries: number = 3
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const thread = await channel.threads.create({
        name: `Answer - ${username}`,
        autoArchiveDuration: 1440,
        type: ChannelType.PublicThread,
        startMessage: message_id,
      })

      await thread.send({
        content: `<@${user_id}> Staff will answer your question here.`,
      })

      return thread.id
    } catch (err) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }
  return null
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask a question to staff")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
        .setMaxLength(1000)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const question    = interaction.options.getString("question", true)
    const user        = interaction.user
    const user_avatar = user.displayAvatarURL({ extension: "png", size: 128 })

    const channel = interaction.client.channels.cache.get(ask_channel_id) as TextChannel
    if (!channel) {
      await interaction.editReply({ content: "Ask channel not found." })
      return
    }

    const message = build_question_panel(user.id, user_avatar, question, true)
    const response = await api.send_components_v2(
      ask_channel_id,
      api.get_token(),
      message
    )

    if (response.error || !response.id) {
      console.log("[ask] API Error:", JSON.stringify(response, null, 2))
      await interaction.editReply({ content: "Failed to send your question." })
      return
    }

    await interaction.editReply({ 
      content: `Your question has been sent! Staff can click "Answer" to create a thread.` 
    })
  },
}
