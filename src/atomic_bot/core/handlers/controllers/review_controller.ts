import { Client, TextChannel }        from "discord.js"
import { load_config }                from "@shared/config/loader"
import { component, time, api }       from "@shared/utils"
import { log_error }                  from "@shared/utils/error_logger"
import * as review_manager            from "@shared/database/managers/review_manager"

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

  // - CHECK DAILY REVIEW LIMIT - \\
  const can_submit = await review_manager.can_submit_review(user_id)
  
  if (!can_submit) {
    const remaining = await review_manager.get_remaining_reviews(user_id)
    return {
      success : false,
      error   : `You've reached your daily review limit (2 reviews per day). Try again tomorrow!`,
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

    const response = await api.send_components_v2(
      config.review_channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
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

    // - SAVE REVIEW TO DATABASE - \\
    await review_manager.save_review(
      user_id,
      review_text,
      rating,
      timestamp,
      response.id || ""
    )

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
