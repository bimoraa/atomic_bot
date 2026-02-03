import { Client }         from "discord.js"
import { db, component }  from "../../../shared/utils"
import { log_error }      from "../../../shared/utils/error_logger"
import * as idn_live      from "../../../infrastructure/api/idn_live"

const NOTIFICATION_COLLECTION = "idn_live_notifications"
const LIVE_STATE_COLLECTION   = "idn_live_state"

interface notification_subscription {
  _id?       : any
  user_id    : string
  member_name: string
  username   : string
  slug       : string
  created_at : number
}

interface live_state_record {
  _id?      : any
  slug      : string
  username  : string
  is_live   : boolean
  started_at: number
  notified  : string[]
}

/**
 * - ADD NOTIFICATION SUBSCRIPTION - \\
 * @param {object} options - Subscription options
 * @returns {Promise<object>} Result with success status
 */
export async function add_notification(options: { user_id: string; member_name: string; client: Client }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const member = await idn_live.get_member_by_name(options.member_name)

    if (!member) {
      return {
        success : false,
        error   : `Member "${options.member_name}" not found. Please check the spelling.`,
      }
    }

    const existing = await db.find_one<notification_subscription>(NOTIFICATION_COLLECTION, {
      user_id     : options.user_id,
      member_name : member.name,
    })

    if (existing) {
      return {
        success : false,
        error   : `You are already subscribed to notifications for ${member.name}.`,
      }
    }

    await db.insert_one<notification_subscription>(NOTIFICATION_COLLECTION, {
      user_id     : options.user_id,
      member_name : member.name,
      username    : member.username,
      slug        : member.slug,
      created_at  : Date.now(),
    })

    return {
      success : true,
      message : `Successfully subscribed to ${member.name} live notifications! You will receive a DM when they go live.`,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "add_idn_notification", {
      user_id     : options.user_id,
      member_name : options.member_name,
    })
    return {
      success : false,
      error   : "Failed to add notification subscription.",
    }
  }
}

/**
 * - REMOVE NOTIFICATION SUBSCRIPTION - \\
 * @param {object} options - Subscription options
 * @returns {Promise<object>} Result with success status
 */
export async function remove_notification(options: { user_id: string; member_name: string; client: Client }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const member = await idn_live.get_member_by_name(options.member_name)

    if (!member) {
      return {
        success : false,
        error   : `Member "${options.member_name}" not found.`,
      }
    }

    const result = await db.delete_one(NOTIFICATION_COLLECTION, {
      user_id     : options.user_id,
      member_name : member.name,
    })

    if (!result) {
      return {
        success : false,
        error   : `You are not subscribed to ${member.name}.`,
      }
    }

    return {
      success : true,
      message : `Successfully unsubscribed from ${member.name} live notifications.`,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "remove_idn_notification", {
      user_id     : options.user_id,
      member_name : options.member_name,
    })
    return {
      success : false,
      error   : "Failed to remove notification subscription.",
    }
  }
}

/**
 * - GET USER SUBSCRIPTIONS - \\
 * @param {string} user_id - Discord user ID
 * @returns {Promise<notification_subscription[]>} List of subscriptions
 */
export async function get_user_subscriptions(user_id: string): Promise<notification_subscription[]> {
  try {
    return await db.find_many<notification_subscription>(NOTIFICATION_COLLECTION, { user_id })
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error fetching subscriptions:", error)
    return []
  }
}

/**
 * - GET CURRENTLY LIVE MEMBERS - \\
 * @returns {Promise<object>} Result with live rooms data
 */
export async function get_currently_live(): Promise<{ success: boolean; data?: idn_live.live_room[]; error?: string }> {
  try {
    const live_rooms = await idn_live.get_live_rooms()

    return {
      success : true,
      data    : live_rooms,
    }
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error fetching live rooms:", error)
    return {
      success : false,
      error   : "Failed to fetch live rooms.",
    }
  }
}

/**
 * - CHECK AND NOTIFY LIVE CHANGES - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
export async function check_and_notify_live_changes(client: Client): Promise<void> {
  try {
    const live_rooms = await idn_live.get_live_rooms()
    const now        = Date.now()

    for (const room of live_rooms) {
      const existing_state = await db.find_one<live_state_record>(LIVE_STATE_COLLECTION, {
        slug    : room.slug,
        is_live : true,
      })

      if (existing_state) {
        continue
      }

      const subscriptions = await db.find_many<notification_subscription>(NOTIFICATION_COLLECTION, {
        username : room.username,
      })

      if (subscriptions.length === 0) {
        continue
      }

      const notified_users: string[] = []

      for (const subscription of subscriptions) {
        try {
          const user = await client.users.fetch(subscription.user_id)

          const message = component.build_message({
            components: [
              idn_live.format_live_component(room),
              component.container({
                components: [
                  component.action_row(
                    component.link_button("Watch Stream", room.url)
                  ),
                ],
              }),
            ],
          })

          await user.send(message)
          notified_users.push(subscription.user_id)

          console.log(`[ - IDN LIVE - ] Notified ${subscription.user_id} about ${room.member_name} live`)
        } catch (error) {
          console.error(`[ - IDN LIVE - ] Failed to notify ${subscription.user_id}:`, error)
        }
      }

      await db.insert_one<live_state_record>(LIVE_STATE_COLLECTION, {
        slug       : room.slug,
        username   : room.username,
        is_live    : true,
        started_at : room.started_at,
        notified   : notified_users,
      })
    }

    const all_live_slugs = live_rooms.map((room) => room.slug)
    const active_states  = await db.find_many<live_state_record>(LIVE_STATE_COLLECTION, {
      is_live : true,
    })

    for (const state of active_states) {
      if (!all_live_slugs.includes(state.slug)) {
        await db.delete_one(LIVE_STATE_COLLECTION, { _id: state._id })
        console.log(`[ - IDN LIVE - ] Stream ended for ${state.username}`)
      }
    }
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error checking live changes:", error)
  }
}

/**
 * - START LIVE MONITORING - \\
 * @param {Client} client - Discord client
 * @param {number} interval_ms - Check interval in milliseconds
 * @returns {NodeJS.Timeout} Interval timer
 */
export function start_live_monitoring(client: Client, interval_ms: number = 60000): NodeJS.Timeout {
  console.log(`[ - IDN LIVE - ] Starting live monitoring every ${interval_ms / 1000}s`)

  check_and_notify_live_changes(client)

  return setInterval(() => {
    check_and_notify_live_changes(client)
  }, interval_ms)
}
