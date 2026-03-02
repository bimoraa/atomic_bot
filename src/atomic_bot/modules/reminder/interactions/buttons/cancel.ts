// - 取消提醒按钮的交互注册 - \
// - registers the cancel reminder button interaction - \
import { ButtonInteraction }  from "discord.js"
import { component, time, db } from "@shared/utils"
import { ButtonHandler }        from "@shared/types/interaction"

interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

export async function handle_reminder_cancel(interaction: ButtonInteraction): Promise<void> {
  try {
    const reminders = await db.find_many<reminder_data>("reminders", {
      user_id: interaction.user.id,
    })

    const now    = Math.floor(Date.now() / 1000)
    const active = reminders.filter(r => r.remind_at > now)

    if (active.length === 0) {
      await interaction.reply({
        content  : "No active reminders to cancel",
        ephemeral: true,
      }).catch(() => {})
      return
    }

    const sorted = active.sort((a, b) => a.remind_at - b.remind_at)
    const options = sorted.slice(0, 25).map((r) => {
      const label = r.note.length > 100 ? r.note.slice(0, 97) + "..." : r.note
      const desc  = `Due ${time.relative_time(r.remind_at)}`
      
      return {
        label      : label,
        value      : r.remind_at.toString(),
        description: desc,
      }
    })

    const select_message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("E74C3C"),
          components  : [
            component.text("## Cancel Reminder"),
          ],
        }),
        component.container({
          components: [
            component.text(`Select reminder to cancel (${active.length} total):`),
            component.divider(2),
            {
              type      : 1,
              components: [
                {
                  type       : 3,
                  custom_id  : "reminder_cancel_select",
                  placeholder: "Select a reminder to cancel",
                  options,
                  min_values : 1,
                  max_values : 1,
                },
              ],
            },
          ],
        }),
      ],
    })

    await interaction.reply({
      ...select_message,
      flags: (select_message.flags ?? 0) | 64,
    }).catch(() => {})
  } catch (err) {
    await interaction.reply({
      content  : "Failed to load reminders",
      ephemeral: true,
    }).catch(() => {})
  }
}

export const button: ButtonHandler = {
  custom_id: "reminder_cancel",
  execute: handle_reminder_cancel,
}
