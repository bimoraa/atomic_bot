/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 评价面板按钮的交互注册 - \
// - registers review panel button interactions - \
import { ButtonInteraction } from "discord.js"
import { ButtonHandler }     from "@shared/types/interaction"
import { modal }             from "@shared/utils"

export const button: ButtonHandler = {
  custom_id: "review_submit",
  async execute(interaction: ButtonInteraction) {
    const review_modal = modal.create_modal(
      "review_submit_modal",
      "Submit a Review",
      modal.create_text_input({
        custom_id  : "review_rating",
        label      : "Rating (1-5 stars)",
        style      : "short",
        placeholder: "e.g. 5",
        required   : true,
        min_length : 1,
        max_length : 1,
      }),
      modal.create_text_input({
        custom_id  : "review_content",
        label      : "Your Review",
        style      : "paragraph",
        placeholder: "Share your experience with us...",
        required   : true,
        min_length : 10,
        max_length : 1000,
      })
    )

    await interaction.showModal(review_modal)
  },
}
