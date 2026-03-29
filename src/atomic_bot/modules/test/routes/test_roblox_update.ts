/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 测试用的，手动触发 Roblox 更新通知看看效果 - \
// - test command, manually fires the roblox update notification to see if it works - \
// - 测试Roblox更新通知命令 - \
// - test roblox update notification command - \

import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js";
import { Command } from "@shared/types/command";
import { test_roblox_update_notification } from "@shared/database/services/roblox_update";
import { is_admin } from "@shared/database/settings/permissions";


export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("test_roblox_update")
    .setDescription("Test roblox update notification") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.", ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const versions = await test_roblox_update_notification();

    if (versions && versions.length > 0) {
      const lines = versions.map(v => `- ${v.platform}: \`${v.version}\` (client: \`${v.client_version}\`)`)
      await interaction.editReply({
        content: `Test notifications sent!\n${lines.join("\n")}`,
      });
    } else {
      await interaction.editReply({
        content: "Failed to fetch Roblox versions (all platforms returned empty).",
      });
    }
  },
};
