import { Client, ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js"
import { component, format, time, db, api } from "../../../shared/utils"
import { log_error }                        from "../../../shared/utils/error_logger"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const max_minutes   = 10080

interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

interface reminder_list_options {
  user_id: string
  client : Client
}

interface add_reminder_options {
  user_id  : string
  client   : Client
  minutes  : number
  note     : string
  guild_id?: string
}

interface cancel_reminder_options {
  user_id   : string
  client    : Client
  remind_at?: number
}

export async function get_reminder_list(options: reminder_list_options) {
  const { user_id, client } = options

  try {
    const reminders = await db.find_many<reminder_data>("reminders", { user_id })
    const now       = Math.floor(Date.now() / 1000)
    const active    = reminders.filter(r => r.remind_at > now)

    if (active.length === 0) {
      return {
        success: true,
        message: component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("9B59B6"),
              components  : [
                component.text("## Active Reminders"),
              ],
            }),
            component.container({
              components: [
                component.text("- Status: No reminders found"),
                component.divider(2),
                component.text("Use /reminder to create a new reminder."),
              ],
            }),
            component.container({
              components: [
                component.action_row(
                  component.secondary_button("Add new Reminder", "reminder_add_new")
                ),
              ],
            }),
          ],
        }),
      }
    }

    const sorted = active.sort((a, b) => a.remind_at - b.remind_at)
    const lines  = sorted.slice(0, 10).map((r, i) => {
      return `${i + 1}. ${r.note}\n> Time: ${time.relative_time(r.remind_at)} ||  ${time.full_date_time(r.remind_at)}\n`
    })

    return {
      success: true,
      message: component.build_message({
        components: [
          component.container({
            accent_color: component.from_hex("9B59B6"),
            components  : [
              component.text("## Active Reminders"),
            ],
          }),
          component.container({
            components: [
              component.text(`- Total: ${active.length} reminder${active.length === 1 ? "" : "s"}`),
              component.divider(2),
              component.text([
                "### Reminder List",
                ...lines,
              ]),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.secondary_button("Add new Reminder", "reminder_add_new"),
                component.danger_button("Cancel Reminder", "reminder_cancel_select")
              ),
            ],
          }),
        ],
      }),
    }
  } catch (err) {
    await log_error(client, err as Error, "Reminder List Controller", {
      user_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to fetch reminders",
    }
  }
}

export async function add_reminder(options: add_reminder_options) {
  const { user_id, client, minutes, note, guild_id } = options

  if (!discord_token) {
    return {
      success: false,
      error  : "Bot token missing",
    }
  }

  const clamped_minutes = Math.max(1, Math.min(minutes, max_minutes))
  const trimmed_note    = note.slice(0, 500)
  const remind_at       = Math.floor((Date.now() + clamped_minutes * 60000) / 1000)
  const now             = Math.floor(Date.now() / 1000)

  const reminder: reminder_data = {
    user_id,
    note      : trimmed_note,
    remind_at,
    created_at: now,
    guild_id,
  }

  try {
    await db.insert_one("reminders", reminder)

    const { schedule_reminder } = await import("../../../modules/reminder/reminder")
    schedule_reminder(client, reminder)

    const confirmation = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("#00eeffff"),
          components: [
            component.text("## Reminder Scheduled\nWe've scheduled your reminder!"),
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
              `> ${trimmed_note}`,
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

    await api.send_dm(user_id, discord_token, confirmation)

    return {
      success       : true,
      message       : "Reminder scheduled! Check your DM.",
      reminder_data : reminder,
    }
  } catch (err) {
    await log_error(client, err as Error, "Add Reminder Controller", {
      user_id,
      remind_at,
      minutes: clamped_minutes,
      note   : trimmed_note,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to create reminder",
    }
  }
}

export async function cancel_reminder(options: cancel_reminder_options) {
  const { user_id, client, remind_at } = options

  try {
    if (remind_at) {
      const deleted = await db.delete_one("reminders", {
        user_id,
        remind_at,
      })

      if (!deleted) {
        return {
          success: false,
          error  : "Reminder not found",
        }
      }

      const { active_reminders } = await import("../../../modules/reminder/reminder")
      const key                  = `${user_id}:${remind_at}`
      const timeout              = active_reminders.get(key)

      if (timeout) {
        clearTimeout(timeout)
        active_reminders.delete(key)
      }

      return {
        success: true,
        message: "Reminder cancelled successfully",
      }
    } else {
      const deleted_count = await db.delete_many("reminders", { user_id })

      if (deleted_count === 0) {
        return {
          success: false,
          error  : "No reminders found",
        }
      }

      const { active_reminders } = await import("../../../modules/reminder/reminder")
      for (const [key, timeout] of active_reminders.entries()) {
        if (key.startsWith(`${user_id}:`)) {
          clearTimeout(timeout)
          active_reminders.delete(key)
        }
      }

      return {
        success: true,
        message: `Cancelled ${deleted_count} reminder${deleted_count === 1 ? "" : "s"}`,
      }
    }
  } catch (err) {
    await log_error(client, err as Error, "Cancel Reminder Controller", {
      user_id,
      remind_at,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to cancel reminder",
    }
  }
}
