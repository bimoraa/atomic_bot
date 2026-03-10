/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /afk-mod list，查看当前 AFK 用户列表 - \
// - /afk-mod list command, shows the current list of AFK users - \
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { get_all_afk }                                                 from "../../../infrastructure/cache/afk"
import { build_simple_message }                                        from "./afk_utils"

const MAX_ITEMS = 25

/**
 * - BUILD AFK MOD LIST SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_mod_list_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("list")
    .setDescription("List AFK statuses")
}

/**
 * - HANDLE AFK MOD LIST - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_list(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild
  if (!guild) {
    const no_guild = build_simple_message("## Error", ["Guild not found."])
    await interaction.editReply(no_guild)
    return
  }

  const all_afk     = get_all_afk()
  const lines       : string[] = []
  let total_count   = 0

  for (const record of all_afk) {
    // - SKIP MEMBER CHECK: guild cache disabled, attempt fetch below - \\
    total_count += 1

    if (lines.length < MAX_ITEMS) {
      lines.push(`<@${record.user_id}> - ${record.reason} - <t:${Math.floor(record.timestamp / 1000)}:R>`)
    }
  }

  if (total_count === 0) {
    const message = build_simple_message("## AFK List", ["No AFK users in this server."])
    await interaction.editReply(message)
    return
  }

  if (total_count > MAX_ITEMS) {
    lines.push(`And ${total_count - MAX_ITEMS} more...`)
  }

  const message = build_simple_message("## AFK List", lines)
  await interaction.editReply(message)
}
