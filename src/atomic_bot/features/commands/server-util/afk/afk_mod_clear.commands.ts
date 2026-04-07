/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /afk-mod clear，管理员清除指定用户的 AFK - \
// - /afk-mod clear command, admin clears a specific user's AFK - \
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { remove_afk }                                                  from "@integrations/cache/afk"
import { build_simple_message }                                        from "@commands/server-util/afk/afk_utils.commands"

/**
 * - 构建 AFK 管理清除子命令 - \\
 * - build afk mod clear subcommand - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - subcommand builder
 * @returns {SlashCommandSubcommandBuilder} updated subcommand builder
 */
export function build_afk_mod_clear_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("clear")
    .setDescription("Remove the AFK status of a member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Target member")
        .setRequired(true)
    )
}

/**
 * - 处理 AFK 管理清除 - \\
 * - handle afk mod clear - \\
 * @param {ChatInputCommandInteraction} interaction - discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_clear(interaction: ChatInputCommandInteraction): Promise<void> {
  const target  = interaction.options.getUser("user", true)
  const removed = await remove_afk(target.id)

  if (!removed) {
    const not_found = build_simple_message("## Error", ["Target user is not AFK."])
    await interaction.editReply(not_found)
    return
  }

  if (interaction.guild) {
    const guild_member = await interaction.guild.members.fetch(target.id).catch(() => null)
    if (guild_member) {
      await guild_member.setNickname(removed.original_nickname).catch(() => {})
    }
  }

  const message = build_simple_message("## AFK Cleared", [`Removed AFK status for <@${target.id}>.`])
  await interaction.editReply(message)
}
