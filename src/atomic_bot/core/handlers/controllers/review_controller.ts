import { Client, TextChannel } from "discord.js"
import { load_config }         from "@shared/config/loader"
import { component, time, api } from "@shared/utils"
import { log_error }           from "@shared/utils/error_logger"

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
    const stars     = "⭐️".repeat(rating)
    const timestamp = time.now()

    // - VALIDATE AVATAR URL - \\
    const valid_avatar = user_avatar && user_avatar.startsWith("http") ? user_avatar : undefined

    // - BUILD REVIEW DETAILS SECTION - \\
    const review_section_options: any = {
      content: [
        `- **Review:** ${review_text}`,
        `- **Rating:** ${stars}(${rating}/5)`,
        `- **Reviewed:** <t:${timestamp}:R> | <t:${timestamp}:F>`,
      ],
    }

    if (valid_avatar) {
      review_section_options.accessory = component.thumbnail(valid_avatar)
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## New Review From <@${user_id}>`),
          ],
        }),
        component.container({
          components: [
            component.section(review_section_options),
          ],
        }),
        component.container({
          components: [
            component.section({
              content   : [`Thank u <@${user_id}> for the Review!`],
              accessory : component.primary_button("Submit a Review", "review_submit"),
            }),
          ],
        }),
      ],
    })

    console.log("[ - REVIEW PAYLOAD - ]", JSON.stringify(message, null, 2))

    const response = await api.send_components_v2(
      config.review_channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
      console.error("[ - REVIEW API ERROR - ]", JSON.stringify(response, null, 2))
      
      await log_error(client, new Error("Discord API Error"), "Review Controller - API", {
        user_id,
        rating,
        api_response : response,
      }).catch(() => {})
      
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
