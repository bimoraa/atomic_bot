/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /whitelist add，给用户添加白名单权限 - \
// - /whitelist add command, gives a user whitelist access - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  User,
}                           from "discord.js"
import { Command }          from "@shared/types/command"
import { member_has_role }  from "@shared/utils/discord_api"
import { whitelist }        from "../controller"

const __allowed_role_id = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Whitelist a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to whitelist")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("Optional note for the whitelist")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days before expiration (leave empty for permanent)")
        .setMinValue(1)
        .setRequired(false)
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
    const note = interaction.options.getString("note") || undefined
    const days = interaction.options.getInteger("days") || undefined

    if (!user) {
      await interaction.reply({
        content  : "Invalid user.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await whitelist({
      user,
      client     : interaction.client,
      note,
      days,
      executor_id: interaction.user.id,
    })

    if (result.success) {
      if (interaction.channel && "send" in interaction.channel) {
        await interaction.channel.send(result.message!)
      }
      await interaction.deleteReply()
    } else {
      await interaction.editReply({
        content: result.error || "Failed to whitelist user",
      })
    }
  },
}
