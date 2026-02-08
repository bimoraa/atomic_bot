import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { get_ignored_channels }                                        from "../../../infrastructure/cache/afk"
import { build_simple_message }                                        from "./afk_utils"

/**
 * - BUILD AFK MOD IGNORED SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_mod_ignored_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("ignored")
    .setDescription("List AFK ignored channels")
}

/**
 * - HANDLE AFK MOD IGNORED - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
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
