import { ButtonInteraction } from "discord.js"
import { modal } from "@shared/utils"

export async function handle_review_submit(interaction: ButtonInteraction) {
  const review_modal = modal.create_modal(
    "review_modal",
    "Submit a Review",
    modal.create_text_input({
      custom_id: "review_text",
      label: "Your Review",
      style: "paragraph",
      placeholder: "Tell us about your experience...",
      required: true,
      max_length: 500,
    }),
    modal.create_text_input({
      custom_id: "review_rating",
      label: "Rating (1-5)",
      style: "short",
      placeholder: "5",
      required: true,
      max_length: 1,
    })
  )

  await interaction.showModal(review_modal)
}
