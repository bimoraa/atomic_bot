import { StringSelectMenuInteraction } from "discord.js"
import { log_error }                   from "@shared/utils/error_logger"
import * as share_settings             from "@atomic/core/handlers/shared/controller/share_settings_controller"

/**
 * - HANDLE SHARE SETTINGS PICKER - \\
 * @param {StringSelectMenuInteraction} interaction - Select interaction
 * @returns {Promise<void>} Void
 */
export async function handle_share_settings_picker(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    const parts = interaction.customId.split(":")
    const token = parts[1]

    if (!token) {
      await interaction.reply({ content: "Invalid selection", ephemeral: true })
      return
    }

    const entry = share_settings.get_pending_entry(token)
    if (!entry) {
      await interaction.reply({ content: "Request expired", ephemeral: true })
      return
    }

    if (entry.user_id !== interaction.user.id) {
      await interaction.reply({ content: "You are not allowed to update this request", ephemeral: true })
      return
    }

    const selected_value = interaction.values[0]
    if (interaction.customId.startsWith("share_settings_pick_rod:")) {
      share_settings.update_pending_payload(token, { rod_name: selected_value })
    }

    if (interaction.customId.startsWith("share_settings_pick_skin:")) {
      share_settings.update_pending_payload(token, { rod_skin: selected_value === "no_skin" ? null : selected_value })
    }

    const updated = share_settings.get_pending_entry(token)
    const rod_options = await share_settings.list_rod_options(interaction.client)
    const skin_options = await share_settings.list_skin_options(interaction.client)

    const payload = share_settings.build_share_settings_picker_message({
      token         : token,
      rod_options   : rod_options,
      skin_options  : skin_options,
      selected_rod  : updated?.payload.rod_name || null,
      selected_skin : updated?.payload.rod_skin ?? null,
    })

    await interaction.update(payload as any)
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_picker", {
      custom_id : interaction.customId,
    })
    await interaction.reply({ content: "Failed to update selection", ephemeral: true }).catch(() => {})
  }
}
