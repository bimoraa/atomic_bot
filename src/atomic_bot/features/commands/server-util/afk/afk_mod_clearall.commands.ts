/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /afk-mod clear-all，管理员清除所有用户的 AFK - \
// - /afk-mod clear-all command, admin clears all users' AFK - \
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { get_all_afk, remove_afk }                                     from "@atomic/integrations/cache/afk"
import { build_simple_message }                                        from "@atomic/features/commands/server-util/afk/afk_utils.commands"

/**
 * - 构建 AFK 管理清除全部子命令 - \\
 * - build afk mod clearall subcommand - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - subcommand builder
 * @returns {SlashCommandSubcommandBuilder} updated subcommand builder
 */
export function build_afk_mod_clearall_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("clearall")
    .setDescription("Remove the AFK status of all members")
}

/**
 * - 处理 AFK 管理清除全部 - \\
 * - handle afk mod clearall - \\
 * @param {ChatInputCommandInteraction} interaction - discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_clearall(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild
  if (!guild) {
    const no_guild = build_simple_message("## Error", ["Guild not found."])
    await interaction.editReply(no_guild)
    return
  }

  const all_afk     = get_all_afk()
  let cleared_count = 0

  for (const record of all_afk) {
    const removed = await remove_afk(record.user_id)
    if (!removed) continue

    cleared_count += 1
    const guild_member = await guild.members.fetch(record.user_id).catch(() => null)
    if (guild_member) {
      await guild_member.setNickname(removed.original_nickname).catch(() => {})
    }
  }

  const message = build_simple_message("## AFK Cleared", [`Removed AFK status for **${cleared_count}** members.`])
  await interaction.editReply(message)
}
