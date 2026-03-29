/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /version 斜杠命令，查看脚本版本信息 - \
// - /version slash command, shows script version information - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command } from "@shared/types/command"
import { component, version as version_util } from "@shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("version")
    .setDescription("Check Roblox version for specific platform") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const platform_options = version_util.platform_targets.map(target => ({
      label: target.name,
      value: target.name,
    }))

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("Select a platform to check its Roblox version:"),
            component.select_menu("version_platform_select", "Select platform", platform_options),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...message, ephemeral: true,
    })
  },
}
