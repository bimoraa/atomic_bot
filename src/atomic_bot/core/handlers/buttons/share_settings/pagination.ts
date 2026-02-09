import { ButtonInteraction } from "discord.js"
import { log_error }         from "@shared/utils/error_logger"
import * as share_settings   from "@atomic/core/handlers/shared/controller/share_settings_controller"

/**
 * - HANDLE SHARE SETTINGS PAGINATION - \\
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_share_settings_pagination(interaction: ButtonInteraction): Promise<void> {
  try {
    const parts     = interaction.customId.split(":")
    const action    = parts[0]
    const token     = parts[1]
    const index_raw = parts[2]

    if (!token || index_raw === undefined) {
      await interaction.reply({ content: "Invalid pagination state", ephemeral: true })
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

    const current_index = Number(index_raw)
    const next_index    = action === "share_settings_next" ? current_index + 1 : current_index - 1

    const payload = share_settings.build_search_message({
      token   : token,
      records : records,
      index   : next_index,
    })

    await interaction.update(payload as any)
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_pagination", {
      custom_id : interaction.customId,
    })
    await interaction.reply({ content: "Failed to paginate", ephemeral: true }).catch(() => {})
  }
}
