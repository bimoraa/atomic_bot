import { ChatInputCommandInteraction, SlashCommandBuilder, Client } from "discord.js"
import { Command }                                           from "../../types/command"
import { api, component, format, time, db }                  from "../../utils"
import { log_error }                                         from "../../utils/error_logger"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const max_minutes   = 10080

interface reminder_data {
  _id?        : any
  user_id     : string
  note        : string
  remind_at   : number
  created_at  : number
  guild_id?   : string
}

export const active_reminders = new Map<string, ReturnType<typeof setTimeout>>()

function build_reminder_dm_notification(reminder: reminder_data) {
  const now = Math.floor(Date.now() / 1000)

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Reminder Notification\nDing dong! Time for your reminder."),
        ],
      }),
      component.container({
        components: [
          component.text([
            `- Scheduled at: ${time.full_date_time(reminder.remind_at)}`,
            `- Deadline: ${time.full_date_time(reminder.remind_at)}`,
          ]),
          component.divider(2),
          component.text([
            `- Message:`,
            `> ${reminder.note}`,
          ]),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.secondary_button("Reminder List", "reminder_list"),
            component.secondary_button("Add new Reminder", "reminder_add_new")
          ),
        ],
      }),
    ],
  })
}

export async function load_reminders_from_db(client: Client): Promise<void> {
  try {
    const reminders = await db.find_many<reminder_data>("reminders", {})
    const now       = Math.floor(Date.now() / 1000)

    for (const reminder of reminders) {
      if (reminder.remind_at <= now) {
        await db.delete_one("reminders", { _id: reminder._id })
        continue
      }

      schedule_reminder(client, reminder)
    }

    console.log(`[Reminder] Loaded ${active_reminders.size} active reminders from database`)
  } catch (err) {
    console.error("[Reminder] Failed to load reminders:", err)
  }
}

export function schedule_reminder(client: Client, reminder: reminder_data): void {
  const now       = Date.now()
  const delay_ms  = (reminder.remind_at * 1000) - now
  const key       = `${reminder.user_id}:${reminder.remind_at}`

  if (delay_ms <= 0) {
    db.delete_one("reminders", { _id: reminder._id }).catch(() => {})
    return
  }

  const timeout = setTimeout(async () => {
    try {
      if (!discord_token) return

      const dm_payload = build_reminder_dm_notification(reminder)

      const result = await api.send_dm(reminder.user_id, discord_token, dm_payload)
      if ((result as any)?.error) {
        throw new Error("Failed to send reminder DM")
      }
    } catch (err) {
      await log_error(client, err as Error, "Reminder DM", {
        user_id  : reminder.user_id,
        remind_at: reminder.remind_at,
        note     : reminder.note,
      }).catch(() => {})
    } finally {
      active_reminders.delete(key)
      await db.delete_one("reminders", { _id: reminder._id }).catch(() => {})
    }
  }, delay_ms)

  active_reminders.set(key, timeout)
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Set a DM reminder")
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Minutes until reminder")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(max_minutes)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("Reminder note")
        .setRequired(true)
        .setMaxLength(500)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const minutes_option = interaction.options.getInteger("minutes", true)
    const note_option    = interaction.options.getString("note", true)

    if (!discord_token) {
      await interaction.reply({ content: "Bot token missing", ephemeral: true })
      return
    }

    const minutes   = Math.max(1, Math.min(minutes_option, max_minutes))
    const note      = note_option.slice(0, 500)
    const remind_at = Math.floor((Date.now() + minutes * 60000) / 1000)
    const now       = Math.floor(Date.now() / 1000)

    const reminder: reminder_data = {
      user_id   : interaction.user.id,
      note      : note,
      remind_at : remind_at,
      created_at: now,
      guild_id  : interaction.guild?.id,
    }

    try {
      await db.insert_one("reminders", reminder)
      schedule_reminder(interaction.client, reminder)

      const confirmation = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Reminder Scheduled"),
            ],
          }),
          component.container({
            components: [
              component.text([
                `- Scheduled at: ${time.full_date_time(now)}`,
                `- Notify at: ${time.relative_time(remind_at)} || ${time.full_date_time(remind_at)}`,
              ]),
              component.divider(2),
              component.text([
                `- Message:`,
                `> ${note}`,
              ]),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.secondary_button("Reminder List", "reminder_list"),
                component.secondary_button("Add Reminder", "reminder_add_new"),
                component.danger_button("Cancel Reminder", "reminder_cancel"),
              ),
            ],
          }),
        ],
      })

      await api.send_dm(interaction.user.id, discord_token, confirmation)

      await interaction.reply({
        content  : "Reminder scheduled! Check your DM.",
        ephemeral: true,
      })
    } catch (err) {
      await log_error(interaction.client, err as Error, "Reminder Create", {
        user      : interaction.user.tag,
        user_id   : interaction.user.id,
        remind_at : remind_at,
        minutes   : minutes,
        note      : note,
      }).catch(() => {})

      await interaction.reply({
        content  : "Failed to create reminder",
        ephemeral: true,
      })
    }
  },
}
