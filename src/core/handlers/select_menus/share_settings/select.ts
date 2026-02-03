import { StringSelectMenuInteraction } from "discord.js"
import { log_error }                   from "../../../../shared/utils/error_logger"
import * as share_settings             from "../../shared/controller/share_settings_controller"

/**
 * - HANDLE SHARE SETTINGS SELECT - \\
 * @param {StringSelectMenuInteraction} interaction - Select interaction
 * @returns {Promise<void>}
 */
export async function handle_share_settings_select(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    const parts       = interaction.customId.split(":")
    const token       = parts[1]
    const selected_id = interaction.values[0]

    if (!token || !selected_id) {
      await interaction.reply({ content: "Invalid selection", ephemeral: true })
      return
    }

    const entry = share_settings.get_search_entry(token)
    if (!entry) {
      await interaction.reply({ content: "Search expired", ephemeral: true })
      return
    }

    const records = await share_settings.build_records_from_search(interaction.client, entry)
    if (records.length === 0) {
      await interaction.reply({ content: "No settings found", ephemeral: true })
      return
    }

    const index   = records.findIndex((record) => record.settings_id === selected_id)
    const payload = share_settings.build_search_message({
      token   : token,
      records : records,
      index   : index >= 0 ? index : 0,
    })

    await share_settings.increment_use_count(interaction.client, selected_id)
    await interaction.update(payload as any)
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_select", {
      custom_id : interaction.customId,
    })
    await interaction.reply({ content: "Failed to handle selection", ephemeral: true }).catch(() => {})
  }
}
