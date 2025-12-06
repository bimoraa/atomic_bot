import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js"
import { Command } from "../../types/command"
import { component, api, format } from "../../utils"

export const ask_channel_id = "1250786601462923396"

export function build_question_panel(
  user_id: string,
  user_avatar: string,
  question: string
): component.message_payload {
  const timestamp = Math.floor(Date.now() / 1000)

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

    const message = build_question_panel(user.id, user_avatar, question)
    const response = await api.send_components_v2(
      ask_channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
      console.log("[ask] API Error:", JSON.stringify(response, null, 2))
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
  },
}
