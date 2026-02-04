import { ButtonInteraction } from "discord.js"
import { modal }             from "../../../../shared/utils"
import { log_error }         from "../../../../shared/utils/error_logger"
import * as share_settings   from "../../shared/controller/share_settings_controller"

/**
 * - HANDLE SHARE SETTINGS CONTINUE - \\
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>} Void
 */
export async function handle_share_settings_continue(interaction: ButtonInteraction): Promise<void> {
  try {
    const parts = interaction.customId.split(":")
    const token = parts[1]

    if (!token) {
      await interaction.reply({ content: "Invalid request", ephemeral: true })
      return
    }

    const entry = share_settings.get_pending_entry(token)
    if (!entry) {
      await interaction.reply({ content: "Request expired", ephemeral: true })
      return
    }

    if (entry.user_id !== interaction.user.id) {
      await interaction.reply({ content: "You are not allowed to continue this request", ephemeral: true })
      return
    }

    if (!entry.payload.rod_name) {
      await interaction.reply({ content: "Please select a rod name first", ephemeral: true })
      return
    }

    const note_input = modal.create_text_input({
      custom_id  : "note",
      label      : "Note from Publisher",
      style      : "paragraph",
      required   : true,
      min_length : 1,
      max_length : 400,
    })

    const note_modal = modal.create_modal(`share_settings_modal:${token}`, "Share Settings", note_input)
    await interaction.showModal(note_modal)
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_continue", {
      custom_id : interaction.customId,
    })
    await interaction.reply({ content: "Failed to open settings modal", ephemeral: true }).catch(() => {})
  }
}
