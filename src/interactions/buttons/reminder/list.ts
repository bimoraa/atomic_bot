import { ButtonInteraction }  from "discord.js"
import { component, format, time, db } from "../../../utils"
import { log_error }          from "../../../utils/error_logger"

interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

export async function handle_reminder_list(interaction: ButtonInteraction): Promise<void> {
  try {
    const reminders = await db.find_many<reminder_data>("reminders", {
      user_id: interaction.user.id,
    })

    const now    = Math.floor(Date.now() / 1000)
    const active = reminders.filter(r => r.remind_at > now)

    if (active.length === 0) {
      const empty_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xE0E0E0,
            components: [
              component.text("## Active Reminders"),
              component.divider(2),
              component.text([
                `${format.bold("Status:")} No reminders found`,
                `${format.bold("Total:")} 0 active`,
              ]),
              component.divider(2),
              component.text("Use /reminder to create a new reminder."),
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

    const sorted = active.sort((a, b) => a.remind_at - b.remind_at)
    const lines  = sorted.slice(0, 10).map((r, i) => {
      const note_preview = r.note.length > 40 ? r.note.slice(0, 37) + "..." : r.note
      return `${format.bold((i + 1).toString() + ".")} ${note_preview}\n   ${format.bold("Time:")} ${time.full_date_time(r.remind_at)} (${time.relative_time(r.remind_at)})`
    })

    const list_message = component.build_message({
      components: [
        component.container({
          accent_color: 0x5865F2,
          components: [
            component.text("## Active Reminders"),
            component.divider(2),
            component.text([
              `${format.bold("Total:")} ${active.length} reminder${active.length === 1 ? "" : "s"}`,
              `${format.bold("Showing:")} ${Math.min(active.length, 10)} of ${active.length}`,
            ]),
            component.divider(2),
            component.text(lines),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...list_message,
      flags: (list_message.flags ?? 0) | 64,
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "Reminder List Button", {
      user   : interaction.user.tag,
      user_id: interaction.user.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to fetch reminders",
      ephemeral: true,
    }).catch(() => {})
  }
}
