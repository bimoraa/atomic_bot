import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }        from "@shared/types/command"
import { api }            from "@shared/utils"
import { log_error }      from "@shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE SETTINGS LEADERBOARD COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_settings_leaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const records = await share_settings.list_settings_records(interaction.client)

    if (records.length === 0) {
      await api.edit_deferred_reply(interaction, share_settings.build_leaderboard_message([]))
      return
    }

    const payload = share_settings.build_leaderboard_message(records)
    await api.edit_deferred_reply(interaction, payload)
  } catch (error) {
    await log_error(interaction.client, error as Error, "settings_leaderboard_command", {})
    await api.edit_deferred_reply(interaction, share_settings.build_leaderboard_message([]))
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("settings-leaderboard")
    .setDescription("Show rod settings leaderboard") as SlashCommandBuilder,

  execute : execute_settings_leaderboard,
}
