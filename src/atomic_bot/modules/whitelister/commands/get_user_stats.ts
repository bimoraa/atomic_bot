/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /whitelist get-user-stats，查看用户统计数据 - \
// - /whitelist get-user-stats command, shows user statistics - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "@shared/types/command"
import { member_has_role }  from "@shared/utils/discord_api"
import { get_user_stats }      from "../controller"

const __allowed_role_id = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("get_user_stats")
    .setDescription("Get whitelist statistics for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get stats for")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server.",
        ephemeral: true,
      })
      return
    }

    const member = interaction.member as GuildMember

    if (!member || !member.roles || member_has_role(member, __allowed_role_id) === false) {
      await interaction.reply({
        content  : "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const user = interaction.options.getUser("user") as User

    if (!user) {
      await interaction.reply({
        content  : "Invalid user.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await get_user_stats({
      user,
      client     : interaction.client,
      executor_id: interaction.user.id,
    })

    if (result.success) {
      await interaction.editReply(result.message!)
    } else {
      await interaction.editReply({
        content: result.error || "Failed to get user stats",
      })
    }
  },
}
