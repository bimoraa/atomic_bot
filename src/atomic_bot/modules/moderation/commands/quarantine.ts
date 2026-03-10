/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /quarantine 斜杠命令，隔离用户 - \
// - /quarantine slash command, puts a user in quarantine - \
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                            from "discord.js"
import { Command }            from "@shared/types/command"
import { quarantine_member }  from "../../quarantine/controller"

/**
 * @description Quarantine member command - restricts member from viewing all channels
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quarantine")
    .setDescription("Quarantine a member (cannot see all channels)")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to quarantine")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days for quarantine")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for quarantine")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const days     = interaction.options.getInteger("days") as number
    const reason   = interaction.options.getString("reason") || "No reason provided"
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    const result = await quarantine_member({
      client   : interaction.client,
      guild,
      executor,
      target,
      days,
      reason,
    })

    if (result.success) {
      await interaction.reply({
        ...result.message,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to quarantine member",
        ephemeral : true,
      })
    }
  },
}
