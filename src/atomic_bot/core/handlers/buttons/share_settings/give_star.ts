import { ButtonInteraction } from "discord.js"
import { api }               from "@shared/utils"
import { log_error }         from "@shared/utils/error_logger"
import * as share_settings   from "@atomic/core/handlers/shared/controller/share_settings_controller"

/**
 * - HANDLE GIVE STAR BUTTON - \\
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_give_star(interaction: ButtonInteraction): Promise<void> {
  try {
    const parts       = interaction.customId.split(":")
    const settings_id = parts[1]
    const token       = parts[2]

    if (!settings_id) {
      await interaction.reply({ content: "Settings not found", ephemeral: true })
      return
    }

    const result = await share_settings.apply_star_vote(interaction.client, settings_id, interaction.user.id)

    if (!result.success) {
      await interaction.reply({ content: result.message || "Failed to give star", ephemeral: true })
      return
    }

    if (result.record?.channel_id && result.record?.message_id) {
      const resolved_token = token || result.record.settings_id
      const entry = share_settings.get_search_entry(resolved_token)
      const records = entry
        ? await share_settings.build_records_from_search(interaction.client, entry)
        : [result.record]

      const index = records.findIndex((record) => record.settings_id === result.record?.settings_id)
      const payload = share_settings.build_search_message({
        token   : share_settings.create_search_token(records, entry?.query || {}, resolved_token),
        records : records.length > 0 ? records : [result.record],
        index   : index >= 0 ? index : 0,
      })

      await api.edit_components_v2(result.record.channel_id, result.record.message_id, api.get_token(), payload)
    }

    if (result.record?.forum_thread_id && result.record?.forum_message_id) {
      await share_settings.update_forum_message(interaction.client, result.record)
    }

    await interaction.reply({ content: "Star submitted", ephemeral: true })
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_star", {
      custom_id : interaction.customId,
    })
    await interaction.reply({ content: "Failed to process star", ephemeral: true }).catch(() => {})
  }
}
