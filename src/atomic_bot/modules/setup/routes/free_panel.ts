/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /setup free-panel，部署免费脚本面板 - \
// - /setup free-panel command, deploys the free scripts panel - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command }  from "@shared/types/command"
import { is_admin } from "@shared/database/settings/permissions"
import { component, api } from "@shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("free-panel")
    .setDescription("Send the free script panel")
    .addStringOption(option =>
      option
        .setName("channel")
        .setDescription("Channel to send the panel to")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content : "You don't have permission to use this command.",
        flags   : 64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const channel_id = interaction.options.getString("channel", true)
    let channel: TextChannel | null = null

    try {
      channel = await interaction.client.channels.fetch(channel_id) as TextChannel
    } catch {
      channel = null
    }

    if (!channel) {
      await interaction.editReply({
        content : `Channel not found. ID: ${channel_id}`,
      })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                "## Free Script Control Panel",
                "Click the button below to get your free script access.",
                "You will be automatically whitelisted and receive the script role.",
              ],
              thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
            }),
          ],
        }),
        component.container({
          components: [
            component.text("**This is a one-time setup. Click \"Get Script\" to receive your loader.**"),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.success_button("Get Script", "free_get_script"),
              component.secondary_button("Reset HWID", "free_reset_hwid"),
              component.secondary_button("Get Stats", "free_get_stats"),
              component.primary_button("Execution Leaderboard", "free_leaderboard")
            ),
          ],
        }),
      ],
    })

    await api.send_components_v2(channel.id, api.get_token(), message)

    await interaction.editReply({
      content : "Free panel sent!",
    })
  },
}
