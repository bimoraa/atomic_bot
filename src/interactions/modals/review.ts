import { ModalSubmitInteraction } from "discord.js"
import { submit_review }          from "../controller/review_controller"

export async function handle_review_modal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 })

  const review_text = interaction.fields.getTextInputValue("review_text")
  const rating_str  = interaction.fields.getTextInputValue("review_rating")

  const rating = parseInt(rating_str)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    await interaction.editReply({
      content: "Rating must be a number between 1 and 5.",
    })
    return
  }

  const user       = interaction.user
  const user_avatar = user.displayAvatarURL({ size: 128 })

  const result = await submit_review({
    client      : interaction.client,
    user_id     : user.id,
    user_avatar,
    review_text,
    rating,
  })

  if (result.success) {
    await interaction.editReply({ content: "Thank you for your review!" })
  } else {
    await interaction.editReply({ content: result.error || "Failed to submit review." })
  }
}
