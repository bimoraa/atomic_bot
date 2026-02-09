import { ChatInputCommandInteraction, ChannelType, SlashCommandSubcommandBuilder } from "discord.js"
import { add_ignored_channel, remove_ignored_channel, is_ignored_channel }          from "../../../infrastructure/cache/afk"
import { build_simple_message }                                                     from "./afk_utils"

/**
 * - BUILD AFK MOD IGNORE SUBCOMMAND - \\
 * @param {SlashCommandSubcommandBuilder} subcommand - Subcommand builder
 * @returns {SlashCommandSubcommandBuilder} Updated subcommand builder
 */
export function build_afk_mod_ignore_subcommand(subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return subcommand
    .setName("ignore")
    .setDescription("Ignore AFK checks in a channel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to ignore")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        )
        .setRequired(true)
    )
}

/**
 * - HANDLE AFK MOD IGNORE - \\
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_afk_mod_ignore(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel  = interaction.options.getChannel("channel", true)
  const guild_id = interaction.guildId

  if (!guild_id) {
    const no_guild = build_simple_message("## Error", ["Guild not found."])
    await interaction.editReply(no_guild)
    return
  }

  if (is_ignored_channel(guild_id, channel.id)) {
    await remove_ignored_channel(guild_id, channel.id)
    const message = build_simple_message("## Channel Unignored", [`AFK checks are enabled in <#${channel.id}>.`])
    await interaction.editReply(message)
    return
  }

  await add_ignored_channel(guild_id, channel.id, interaction.user.id)
  const message = build_simple_message("## Channel Ignored", [`AFK checks are disabled in <#${channel.id}>.`])
  await interaction.editReply(message)
}
