/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /send-cc-panel 斜杠命令，发送 CC 面板消息到指定频道 - \\
// - /send-cc-panel slash command, sends the CC panel message to specified channel - \\

import { ChannelType, ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Command }                                                                                          from "@shared/types/command"
import { component }                                                                                        from "@utils"
import { log_error }                                                                                        from "@utils/error_logger"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("send-cc-panel")
    .setDescription("Send the Content Creator panel to a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt
        .setName("channel")
        .setDescription("Channel to send the CC panel to")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

  /**
   * @description sends the cc panel to the specified channel
   * @param {ChatInputCommandInteraction} interaction - discord slash interaction
   * @returns {Promise<void>}
   */
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    try {
      const target_channel = interaction.options.getChannel("channel", true)

      const panel_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Content Creator Panel",
                "Welcome, CC.",
                "Earn Rp 2.500 for every user who purchases a script using your Discord invite link.",
                "",
                "Use this panel to track your earnings, invites, and overall performance.",
              ]),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.success_button("Check Earnings", "cc_check_earnings"),
                component.secondary_button("Get Invite Link", "cc_get_invite"),
                component.primary_button("View Invite Logs", "cc_view_invite_logs"),
              ),
            ],
          }),
        ],
      })

      const channel = await interaction.guild?.channels.fetch(target_channel.id)
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("ED4245"),
                components: [
                  component.text("## Error\nCannot send to that channel."),
                ],
              }),
            ],
          }),
          flags: 64,
        })
        return
      }

      await (channel as any).send(panel_message)

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("57F287"),
              components: [
                component.text(`CC Panel sent to <#${target_channel.id}> successfully.`),
              ],
            }),
          ],
        }),
        flags: 64,
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Send CC Panel Command", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId ?? undefined,
      }).catch(() => {})
    }
  },
}
