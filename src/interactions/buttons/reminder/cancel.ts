import { ButtonInteraction }  from "discord.js"
import { cancel_reminder }    from "../../shared/reminder_controller"

export async function handle_reminder_cancel(interaction: ButtonInteraction): Promise<void> {
  const result = await cancel_reminder({
    user_id: interaction.user.id,
    client : interaction.client,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to cancel reminders",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.reply({
    content  : result.message || "All reminders cancelled",
    ephemeral: true,
  }).catch(() => {})
}
