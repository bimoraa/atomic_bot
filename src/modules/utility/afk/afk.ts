import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js"
import { Command }                                                     from "../../../shared/types/command"
import { log_error }                                                   from "../../../shared/utils/error_logger"
import { build_simple_message }                                        from "./afk_utils"
import { build_afk_set_subcommand, handle_afk_set }                    from "./afk_set"
import { build_afk_mod_clear_subcommand, handle_afk_mod_clear }        from "./afk_mod_clear"
import { build_afk_mod_clearall_subcommand, handle_afk_mod_clearall }  from "./afk_mod_clearall"
import { build_afk_mod_ignore_subcommand, handle_afk_mod_ignore }      from "./afk_mod_ignore"
import { build_afk_mod_ignored_subcommand, handle_afk_mod_ignored }    from "./afk_mod_ignored"
import { build_afk_mod_list_subcommand, handle_afk_mod_list }          from "./afk_mod_list"
import { build_afk_mod_reset_subcommand, handle_afk_mod_reset }        from "./afk_mod_reset"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("AFK tools")
    .addSubcommand(build_afk_set_subcommand)
    .addSubcommandGroup((group) =>
      group
        .setName("mod")
        .setDescription("AFK moderation")
        .addSubcommand(build_afk_mod_clear_subcommand)
        .addSubcommand(build_afk_mod_clearall_subcommand)
        .addSubcommand(build_afk_mod_ignore_subcommand)
        .addSubcommand(build_afk_mod_ignored_subcommand)
        .addSubcommand(build_afk_mod_list_subcommand)
        .addSubcommand(build_afk_mod_reset_subcommand)
    ) as SlashCommandBuilder,

  /**
   * - EXECUTE AFK COMMAND - \\
   * @param {ChatInputCommandInteraction} interaction - Discord interaction
   * @returns {Promise<void>}
   */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const member = interaction.member as GuildMember | null

      const subcommand_group = interaction.options.getSubcommandGroup(false)
      const subcommand       = interaction.options.getSubcommand()

      if (subcommand_group === "mod") {
        if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
          const no_permission = build_simple_message("## Error", ["You do not have permission to use this command."])
          await interaction.reply({ ...no_permission, ephemeral: true })
          return
        }

        await interaction.deferReply({ ephemeral: true })

        if (subcommand === "clear") {
          await handle_afk_mod_clear(interaction)
          return
        }

        if (subcommand === "clearall") {
          await handle_afk_mod_clearall(interaction)
          return
        }

        if (subcommand === "ignore") {
          await handle_afk_mod_ignore(interaction)
          return
        }

        if (subcommand === "ignored") {
          await handle_afk_mod_ignored(interaction)
          return
        }

        if (subcommand === "list") {
          await handle_afk_mod_list(interaction)
          return
        }

        if (subcommand === "reset") {
          await handle_afk_mod_reset(interaction)
          return
        }

        const invalid = build_simple_message("## Error", ["Unknown AFK moderation action."])
        await interaction.editReply(invalid)
        return
      }

      await interaction.deferReply({ ephemeral: true })
      await handle_afk_set(interaction)
    } catch (error) {
      console.error("[ - AFK COMMAND - ] Error:", error)
      await log_error(interaction.client, error as Error, "AFK Command", {
        user_id   : interaction.user.id,
        guild_id  : interaction.guildId || "",
        channel_id: interaction.channelId || "",
      })

      const error_message = build_simple_message("## Error", ["Failed to process AFK command."])
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(error_message).catch(() => {})
      } else {
        await interaction.reply({ ...error_message, ephemeral: true }).catch(() => {})
      }
    }
  },
}
