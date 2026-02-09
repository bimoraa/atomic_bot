import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { remove_afk }                                                  from "../../../infrastructure/cache/afk"
import { build_simple_message }                                        from "./afk_utils"

/**
 * - BUILD AFK MOD CLEAR SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
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
 * - HANDLE AFK MOD CLEAR - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
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

  const guild_member = interaction.guild?.members.cache.get(target.id)
  if (guild_member) {
    try {
      await guild_member.setNickname(removed.original_nickname)
    } catch {}
  }

  const message = build_simple_message("## AFK Cleared", [`Removed AFK status for <@${target.id}>.`])
  await interaction.editReply(message)
}
