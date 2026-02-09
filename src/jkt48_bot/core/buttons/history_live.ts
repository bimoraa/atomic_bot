import { ButtonInteraction }                                from "discord.js"
import { log_error }                                        from "@shared/utils/error_logger"
import { build_history_message, get_history_records }       from "../controllers/jkt48_live_controller"

/**
 * - HANDLE HISTORY LIVE BUTTON - \\
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>} Void
 */
export async function handle_history_live_button(interaction: ButtonInteraction): Promise<void> {
  try {
    const parts    = interaction.customId.split(":")
    const action   = parts[0] || ""
    const platform = parts[1] || "idn"
    const index    = Number(parts[2] || 0)
    const delta    = action === "history_live_prev" ? -1 : 1

    const records    = await get_history_records(interaction.client, platform)
    const next_index = index + delta

    const message    = build_history_message({
      platform  : platform,
      records   : records,
      index     : next_index,
      requester : interaction.user.username,
    })

    await interaction.update(message)
  } catch (error) {
    await log_error(interaction.client, error as Error, "history_live_button", {
      custom_id : interaction.customId,
      user_id   : interaction.user.id,
    })
  }
}
