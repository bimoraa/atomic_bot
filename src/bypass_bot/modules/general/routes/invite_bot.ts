/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component }                                        from "@shared/utils"

/**
 * - 邀请机器人命令 - \\
 * - invite bot command - \\
 */
const invite_bot_command: Command = {
  data: new SlashCommandBuilder()
    .setName("invite-bot")
    .setDescription("Get the invite link for this bot"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const client_id = interaction.client.user?.id

    if (!client_id) {
      await interaction.reply({
        content   : "Failed to resolve bot client ID.", ephemeral: true,
      })
      return
    }

    const invite_url = `https://discord.com/oauth2/authorize?client_id=${client_id}&permissions=4503599694556160&integration_type=0&scope=bot`

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Invite Bypass Bot",
              "",
              `Use this link to invite the bot: ${invite_url}`,
              "",
              "Note: adjust permissions as needed after inviting.",
            ]),
          ],
        }),
      ],
    })

    message.flags = (message.flags ?? 0) | 64

    await interaction.reply(message)
  },
}

export default invite_bot_command
