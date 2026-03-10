/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 关单请求按钮组件的定义和构建 - \
// - button component definitions for close request - \
import { ButtonInteraction, ThreadChannel } from "discord.js"
import { close_ticket_by_deadline, cancel_close_request } from "@atomic/modules/staff/commands/close_request"
import { component } from "@shared/utils"
import { ButtonHandler } from "@shared/types/interaction"

export const button: ButtonHandler = {
  custom_id: /^close_request_(accept|deny)$/,
  async execute(interaction: ButtonInteraction) {
    const thread = interaction.channel as ThreadChannel

    if (!thread.isThread()) {
      await interaction.reply({
        content  : "This can only be used in a ticket thread.",
        ephemeral: true,
      })
      return
    }

    const is_accept = interaction.customId === "close_request_accept"

    await interaction.deferUpdate()

    if (is_accept) {
      await close_ticket_by_deadline(thread, "Accepted by ticket owner")
    } else {
      await cancel_close_request(thread.id)

      const denied_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text([
                "## Close Request Denied",
                `<@${interaction.user.id}> has denied the close request.`,
                "The ticket will remain open.",
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(denied_message).catch(() => {})
    }
  },
}
