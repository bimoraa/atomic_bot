/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /setup booster-log-panel，部署 booster 日志面板 - \
// - /setup booster-log-panel command, deploys the booster log panel - \
import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType } from "discord.js"
import { Command }                                                       from "@shared/types/command"
import { file }                                                          from "@shared/utils"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-booster-log")
    .setDescription("Setup booster log channel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel for booster logs")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 })

    const channel = interaction.options.getChannel("channel", true)

    const config = {
      booster_log_channel_id: channel.id,
      booster_media_url     : "",
    }

    const config_path = "src/configuration/booster.cfg"
    file.write_json(config_path, config)

    await interaction.editReply({
      content: `Booster log channel set to <#${channel.id}>`,
    })
  },
}

export default command
