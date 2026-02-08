import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js"
import { update_afk_reason }                                           from "../../../infrastructure/cache/afk"
import { build_simple_message }                                        from "./afk_utils"

/**
 * - BUILD AFK MOD RESET SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_mod_reset_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("reset")
    .setDescription("Reset the AFK message of a member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Target member")
        .setRequired(true)
    )
}

/**
 * - HANDLE AFK MOD RESET - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_reset(interaction: ChatInputCommandInteraction): Promise<void> {
  const target  = interaction.options.getUser("user", true)
  const updated = await update_afk_reason(target.id, "AFK")

  if (!updated) {
    const not_found = build_simple_message("## Error", ["Target user is not AFK."])
    await interaction.editReply(not_found)
    return
  }

  const message = build_simple_message("## AFK Message Reset", [`Reset AFK message for <@${target.id}>.`])
  await interaction.editReply(message)
}
