import { ModalSubmitInteraction, TextChannel } from "discord.js"
import { load_config } from "../../configuration/loader"
import { component, time, api } from "../../utils"

const config = load_config<{ review_channel_id: string }>("review")

export async function handle_review_modal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 })

  const review_text = interaction.fields.getTextInputValue("review_text")
  const rating_str = interaction.fields.getTextInputValue("review_rating")

  const rating = parseInt(rating_str)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    await interaction.editReply({
      content: "Rating must be a number between 1 and 5.",
    })
    return
  }

  const stars = "⭐".repeat(rating)
  const timestamp = time.now()

  const channel = interaction.client.channels.cache.get(config.review_channel_id) as TextChannel
  if (!channel) {
    await interaction.editReply({
      content: "Review channel not found.",
    })
    return
  }

  const user = interaction.user
  const avatar_url = user.displayAvatarURL({ size: 128 })

  try {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## New Review from <@${user.id}>`,
                `**Review:** ${review_text}`,
                `**Rating:** ${stars}`,
                `**Reviewed:** ${time.relative_time(timestamp)}`,
              ],
              thumbnail: avatar_url,
            }),
            component.divider(),
            component.action_row(
              component.primary_button("Submit a Review", "review_submit"),
              component.secondary_button("Useful", `review_useful_${user.id}_${timestamp}`)
            ),
          ],
        }),
      ],
    })

    const data = await api.send_components_v2(channel.id, api.get_token(), message)

    if (data.error) {
      console.log("[review] Error:", data)
      await interaction.editReply({
        content: "Failed to submit review. Check console for details.",
      })
      return
    }

    await interaction.editReply({
      content: "Thank you for your review!",
    })
  } catch (err) {
    console.log("[review] Error:", err)
    await interaction.editReply({
      content: "Failed to submit review.",
    })
  }
}
