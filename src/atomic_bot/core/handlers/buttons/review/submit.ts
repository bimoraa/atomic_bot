/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理提交评价的按钮，弹出评价 modal - \
// - handles the review submit button, opens a review modal - \
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
