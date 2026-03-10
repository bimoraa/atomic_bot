/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - ask 相关按钮的定义和构建 - \
// - button definitions and builders for the ask feature - \
import { ButtonInteraction, TextChannel } from "discord.js"
import { ButtonHandler }                  from "@shared/types/interaction"
import { modal }                          from "@shared/utils"
import { create_thread_for_message }      from "@atomic/modules/ask/commands/ask"

export const button: ButtonHandler = {
  custom_id: /^ask_(staff_button|answer_)/,
  async execute(interaction: ButtonInteraction) {
    if (interaction.customId === "ask_staff_button") {
      const ask_modal = modal.create_modal(
        "ask_staff_modal",
        "Ask a Staff",
        modal.create_text_input({
          custom_id  : "ask_question",
          label      : "Your Question",
          style      : "paragraph",
          placeholder: "Type your question here...",
          required   : true,
          min_length : 5,
          max_length : 1000,
        })
      )
      await interaction.showModal(ask_modal)
      return
    }

    if (interaction.customId.startsWith("ask_answer_")) {
      const user_id  = interaction.customId.replace("ask_answer_", "")
      const channel  = interaction.channel as TextChannel
      const username = (await interaction.client.users.fetch(user_id).catch(() => null))?.username || user_id

      await interaction.deferReply({ flags: 64 })

      const thread_id = await create_thread_for_message(
        channel,
        interaction.message.id,
        user_id,
        username
      )

      if (!thread_id) {
        await interaction.editReply({ content: "Failed to create answer thread." })
        return
      }

      await interaction.editReply({ content: `Answer thread created: <#${thread_id}>` })
    }
  },
}
