/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /afk set，设置自定义 AFK 消息 - \
// - /afk set command, sets a custom AFK message - \
import { ChatInputCommandInteraction, GuildMember, SlashCommandSubcommandBuilder } from "discord.js"
import { set_afk, is_ignored_channel }                                              from "../../../infrastructure/cache/afk"
import { build_simple_message, sanitize_afk_reason }                                from "./afk_utils"

/**
 * - BUILD AFK SET SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_set_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("set")
    .setDescription("Set your AFK status")
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for being AFK")
        .setRequired(false)
    )
}

/**
 * - HANDLE AFK SET - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_set(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.guildId && interaction.channelId && is_ignored_channel(interaction.guildId, interaction.channelId)) {
    const ignored_message = build_simple_message("## AFK Set Disabled", ["AFK set is disabled in this channel."])
    await interaction.editReply(ignored_message)
    return
  }

  const raw_reason = interaction.options.getString("reason") || "AFK"
  const reason     = sanitize_afk_reason(raw_reason)
  const member = interaction.guild
    ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
    : null

  if (member) {
    const original_nickname = member.nickname
    const display_name      = member.displayName

    await set_afk(interaction.user.id, reason, original_nickname)

    if (!display_name.startsWith("[AFK]")) {
      try {
        await member.setNickname(`[AFK] - ${display_name}`)
      } catch {}
    }
  } else {
    await set_afk(interaction.user.id, reason, null)
  }

  const afk_confirmation = build_simple_message("## AFK Set", [`<@${interaction.user.id}> I set your AFK: ${reason}`])
  await interaction.editReply(afk_confirmation)
}
