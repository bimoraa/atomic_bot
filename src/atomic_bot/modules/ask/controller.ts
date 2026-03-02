import { Client, TextChannel } from "discord.js"
import { component, api }      from "@shared/utils"
import { log_error }           from "@shared/utils/error_logger"

interface ask_question_options {
  client       : Client
  user_id      : string
  user_avatar  : string
  question     : string
  channel_id   : string
  show_buttons : boolean
}

export function build_question_panel(
  user_id      : string,
  user_avatar  : string,
  question     : string,
  show_buttons : boolean = true
) {
  const components: any[] = [
    component.container({
      components: [
        component.section({
          content: [
            `## Question from <@${user_id}>`,
            ``,
            `Question: ${question}`,
          ],
          thumbnail: user_avatar,
        }),
      ],
    }),
  ]

  if (show_buttons) {
    components.push(
      component.container({
        components: [
          component.action_row(
            component.primary_button("Answer", `ask_answer_${user_id}`)
          ),
        ],
      })
    )
  }

  return component.build_message({ components })
}

export async function post_question(options: ask_question_options) {
  const { client, user_id, user_avatar, question, channel_id, show_buttons } = options

  try {
    const message = build_question_panel(user_id, user_avatar, question, show_buttons)
    const response = await api.send_components_v2(
      channel_id,
      api.get_token(),
      message
    )

    if (response.error || !response.id) {
      return {
        success : false,
        error   : "Failed to post question",
      }
    }

    return {
      success    : true,
      message    : "Question posted successfully",
      message_id : response.id,
    }
  } catch (err) {
    await log_error(client, err as Error, "Ask Controller", {
      user_id,
      question,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to post question",
    }
  }
}
