/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /afk-mod ignored，查看被忽略的 AFK 频道列表 - \
// - /afk-mod ignored command, shows the list of AFK-ignored channels - \
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { get_ignored_channels }                                        from "@atomic/integrations/cache/afk"
import { build_simple_message }                                        from "@atomic/features/commands/server-util/afk/afk_utils.commands"

/**
 * - 构建 AFK 管理忽略列表子命令 - \\
 * - build afk mod ignored subcommand - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - subcommand builder
 * @returns {SlashCommandSubcommandBuilder} updated subcommand builder
 */
export function build_afk_mod_ignored_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("ignored")
    .setDescription("List AFK ignored channels")
}

/**
 * - 处理 AFK 管理忽略列表 - \\
 * - handle afk mod ignored - \\
 * @param {ChatInputCommandInteraction} interaction - discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_ignored(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild_id = interaction.guildId
  if (!guild_id) {
    const no_guild = build_simple_message("## Error", ["Guild not found."])
    await interaction.editReply(no_guild)
    return
  }

  const ignored = get_ignored_channels(guild_id)
  if (ignored.length === 0) {
    const message = build_simple_message("## Ignored Channels", ["No ignored channels configured."])
    await interaction.editReply(message)
    return
  }

  const lines = ignored.map((id) => `<#${id}>`)
  const message = build_simple_message("## Ignored Channels", lines)
  await interaction.editReply(message)
}
