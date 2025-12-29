import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../types/command"
import { get_reminder_list }                                from "../../interactions/shared/reminder_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminder-list")
    .setDescription("List your active reminders"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = await get_reminder_list({
      user_id: interaction.user.id,
      client : interaction.client,
    })

    if (!result.success) {
      await interaction.reply({
        content  : result.error || "Failed to fetch reminders",
        ephemeral: true,
      })
      return
    }

    await interaction.reply({
      ...result.message,
      flags: (result.message!.flags ?? 0) | 64,
    })
  },
}
