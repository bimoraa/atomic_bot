import { ModalSubmitInteraction } from "discord.js"
import { component, format, time, db } from "../../utils"
import { log_error }                   from "../../utils/error_logger"

interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const max_minutes   = 10080

export async function handle_reminder_add_new_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "reminder_add_new_modal") return false

  try {
    const minutes_input = interaction.fields.getTextInputValue("reminder_minutes")
    const note_input    = interaction.fields.getTextInputValue("reminder_note")

    const minutes_num = parseInt(minutes_input, 10)

    if (isNaN(minutes_num) || minutes_num < 1 || minutes_num > max_minutes) {
      await interaction.reply({
        content  : `Invalid minutes. Must be between 1 and ${max_minutes}.`,
        ephemeral: true,
      })
      return true
    }

    if (!discord_token) {
      await interaction.reply({ content: "Bot token missing", ephemeral: true })
      return true
    }

    const minutes   = Math.max(1, Math.min(minutes_num, max_minutes))
    const note      = note_input.slice(0, 500)
    const remind_at = Math.floor((Date.now() + minutes * 60000) / 1000)
    const now       = Math.floor(Date.now() / 1000)

    const reminder: reminder_data = {
      user_id   : interaction.user.id,
      note      : note,
      remind_at : remind_at,
      created_at: now,
      guild_id  : interaction.guild?.id,
    }

    await db.insert_one("reminders", reminder)

    const { schedule_reminder } = await import("../../commands/tools/reminder")
    schedule_reminder(interaction.client, reminder)

    const confirmation = component.build_message({
      components: [
        component.container({
          accent_color: 0x57F287,
          components: [
            component.text("## Reminder Created"),
            component.divider(2),
            component.text([
              `${format.bold("Message:")}`,
              `${note}`,
            ]),
            component.divider(2),
            component.text([
              `${format.bold("Scheduled Time:")} ${time.full_date_time(remind_at)}`,
              `${format.bold("From Now:")} ${time.relative_time(remind_at)}`,
              `${format.bold("Delivery:")} Direct Message`,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...confirmation,
      ephemeral: true,
    })

    return true
  } catch (err) {
    await log_error(interaction.client, err as Error, "Reminder Modal", {
      user   : interaction.user.tag,
      user_id: interaction.user.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to create reminder",
      ephemeral: true,
    })

    return true
  }
}
