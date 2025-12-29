import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../types/command"
import { component, format, db }                            from "../../utils"
import { log_error }                                        from "../../utils/error_logger"
import { active_reminders }                                 from "./reminder"

interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminder-clear")
    .setDescription("Clear all your reminders"),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const reminders = await db.find_many<reminder_data>("reminders", {
        user_id: interaction.user.id,
      })

      if (reminders.length === 0) {
        const empty_message = component.build_message({
          components: [
            component.container({
              accent_color: 0xE0E0E0,
              components: [
                component.text("## Clear Reminders"),
                component.divider(2),
                component.text([
                  `${format.bold("Status:")} No reminders found`,
                  `${format.bold("Action:")} Nothing to clear`,
                ]),
                component.divider(2),
                component.text("You don't have any active reminders to clear."),
              ],
            }),
          ],
        })

        await interaction.reply({
          ...empty_message,
          flags: (empty_message.flags ?? 0) | 64,
        })
        return
      }

      for (const reminder of reminders) {
        const key = `${reminder.user_id}:${reminder.remind_at}`
        const timeout = active_reminders.get(key)
        if (timeout) {
          clearTimeout(timeout)
          active_reminders.delete(key)
        }
      }

      await db.delete_many("reminders", { user_id: interaction.user.id })

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: 0x57F287,
            components: [
              component.text("## Reminders Cleared"),
              component.divider(2),
              component.text([
                `${format.bold("Action:")} Successfully cleared all reminders`,
                `${format.bold("Total Removed:")} ${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`,
                `${format.bold("Status:")} All scheduled notifications cancelled`,
              ]),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...success_message,
        flags: (success_message.flags ?? 0) | 64,
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Reminder Clear", {
        user   : interaction.user.tag,
        user_id: interaction.user.id,
      }).catch(() => {})

      await interaction.reply({
        content  : "Failed to clear reminders",
        ephemeral: true,
      })
    }
  },
}
