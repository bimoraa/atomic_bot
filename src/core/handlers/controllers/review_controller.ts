import { Client, TextChannel } from "discord.js"
import { load_config }         from "../../../shared/config/loader"
import { component, time, api } from "../../../shared/utils"
import { log_error }           from "../../../shared/utils/error_logger"

const config = load_config<{ review_channel_id: string }>("review")

interface submit_review_options {
  client      : Client
  user_id     : string
  user_avatar : string
  review_text : string
  rating      : number
}

export async function submit_review(options: submit_review_options) {
  const { client, user_id, user_avatar, review_text, rating } = options

  if (rating < 1 || rating > 5) {
    return {
      success : false,
      error   : "Rating must be between 1 and 5",
    }
  }

  try {
    const stars     = "⭐".repeat(rating)
    const timestamp = time.now()

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## New Review from <@${user_id}>`,
                `**Review:** ${review_text}`,
                `**Rating:** ${stars}`,
                `**Reviewed:** ${time.relative_time(timestamp)}`,
              ],
              thumbnail: user_avatar,
            }),
            component.divider(),
            component.action_row(
              component.primary_button("Submit a Review", "review_submit"),
              component.secondary_button("Useful", `review_useful_${user_id}_${timestamp}`)
            ),
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(
      config.review_channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
      return {
        success : false,
        error   : "Failed to submit review",
      }
    }

    return {
      success    : true,
      message    : "Review submitted successfully!",
      message_id : response.id,
    }
  } catch (err) {
    await log_error(client, err as Error, "Review Controller", {
      user_id,
      rating,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to submit review",
    }
  }
}
