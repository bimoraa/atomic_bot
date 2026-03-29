/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /setup review-panel，部署评价面板 - \
// - /setup review-panel command, deploys the review panel - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "@shared/types/command"
import { is_admin } from "@shared/database/settings/permissions"
import { component, api } from "@shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("review_panel")
    .setDescription("Send the review panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.", ephemeral: true,
      })
      return
    }

    const channel = interaction.channel as TextChannel

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("# ⭐ Reviews\nShare your experience with us!"),
            component.divider(),
            component.action_row(component.primary_button("Submit a Review", "review_submit")),
          ],
        }),
      ],
    })

    await api.send_components_v2(channel.id, api.get_token(), message)

    await interaction.reply({
      content: "Review panel sent!", ephemeral: true,
    })
  },
}
