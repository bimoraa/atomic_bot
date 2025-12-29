import { ButtonInteraction }    from "discord.js"
import { get_reminder_list } from "../../controller/reminder_controller"

export async function handle_reminder_list(interaction: ButtonInteraction): Promise<void> {
  const result = await get_reminder_list({
    user_id: interaction.user.id,
    client : interaction.client,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to fetch reminders",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.reply({
    ...result.message,
    flags: (result.message!.flags ?? 0) | 64,
  }).catch(() => {})
}
