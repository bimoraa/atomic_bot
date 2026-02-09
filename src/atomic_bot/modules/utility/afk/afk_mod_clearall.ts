import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { get_all_afk, remove_afk }                                     from "../../../infrastructure/cache/afk"
import { build_simple_message }                                        from "./afk_utils"

/**
 * - BUILD AFK MOD CLEARALL SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_mod_clearall_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("clearall")
    .setDescription("Remove the AFK status of all members")
}

/**
 * - HANDLE AFK MOD CLEARALL - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
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
    const guild_member = guild.members.cache.get(record.user_id)
    if (!guild_member) continue

    const removed = await remove_afk(record.user_id)
    if (!removed) continue

    cleared_count += 1
    try {
      await guild_member.setNickname(removed.original_nickname)
    } catch {}
  }

  const message = build_simple_message("## AFK Cleared", [`Removed AFK status for **${cleared_count}** members.`])
  await interaction.editReply(message)
}
