import { StringSelectMenuInteraction } from "discord.js"
import { cancel_reminder }             from "../controllers/reminder_controller"

export async function handle_reminder_cancel_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const selected_time = parseInt(interaction.values[0], 10)

  if (isNaN(selected_time)) {
    await interaction.reply({
      content  : "Invalid reminder selection",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  const result = await cancel_reminder({
    user_id  : interaction.user.id,
    client   : interaction.client,
    remind_at: selected_time,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to cancel reminder",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.reply({
    content  : result.message || "Reminder cancelled successfully",
    ephemeral: true,
  }).catch(() => {})
}
