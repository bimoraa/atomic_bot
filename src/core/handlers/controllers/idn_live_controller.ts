import { Client }         from "discord.js"
import { db, component }  from "../../../shared/utils"
import { log_error }      from "../../../shared/utils/error_logger"
import * as idn_live      from "../../../infrastructure/api/idn_live"
import * as showroom_live from "../../../infrastructure/api/showroom_live"

const NOTIFICATION_COLLECTION = "idn_live_notifications"
const LIVE_STATE_COLLECTION   = "idn_live_state"

function normalize_idn_username(input: string): string {
  return input.toLowerCase().replace(/^@/, "").replace(/\s+/g, "")
}

/**
 * - FORMAT MEMBER DISPLAY NAME - \\
 * @param {string} name - Member name
 * @returns {string} Display name with JKT48 prefix
 */
function format_member_display_name(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "JKT48"
  if (trimmed.toLowerCase().startsWith("jkt48")) return trimmed
  return `JKT48 ${trimmed}`
}

/**
 * - TITLE CASE - \\
 * @param {string} input - Text input
 * @returns {string} Title-cased text
 */
function to_title_case(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

interface notification_subscription {
  _id?       : any
  user_id    : string
  member_name: string
  username   : string
  slug       : string
  room_id?   : number
  type?      : string
  created_at : number
}

interface live_state_record {
  _id?      : any
  slug      : string
  room_id?  : number
  username  : string
  is_live   : boolean
  started_at: number
  notified  : string[]
  type      : string
  live_key  : string
}

interface member_suggestion {
  name  : string
  value : string
}

type live_platform = "idn" | "showroom"

/**
 * - NORMALIZE LIVE PLATFORM - \\
 * @param {string} value - Platform value
 * @returns {live_platform} Normalized platform
 */
function normalize_live_platform(value: string): live_platform {
  const normalized = value.toLowerCase().trim()
  return normalized === "showroom" ? "showroom" : "idn"
}

/**
 * - ADD NOTIFICATION SUBSCRIPTION - \\
 * @param {object} options - Subscription options
 * @returns {Promise<object>} Result with success status
 */
export async function add_notification(options: { user_id: string; member_name: string; client: Client; type?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const platform          = normalize_live_platform(options.type || "idn")
    const fallback_username = normalize_idn_username(options.member_name)
    let member_name         = format_member_display_name(options.member_name.trim())
    let username            = fallback_username
    let room_id             = undefined as number | undefined
    let slug                = ""

    if (platform === "idn") {
      const member = await idn_live.get_member_by_name(options.member_name, options.client)
      const raw_member_name = member?.name || options.member_name.trim()
      member_name = format_member_display_name(raw_member_name)
      username    = member?.username || fallback_username
      slug        = member?.slug || ""
    }

    if (platform === "showroom") {
      const member = await showroom_live.get_showroom_member_by_name(options.member_name, options.client)
      const raw_member_name = member?.name || options.member_name.trim()
      member_name = format_member_display_name(raw_member_name)
      room_id     = member?.room_id
      username    = member?.name || options.member_name.trim()
      slug        = ""
    }

    if (!username || (platform === "showroom" && !room_id)) {
      return {
        success : false,
        error   : "Please provide a valid member name or live username.",
      }
    }

    const existing_query: Record<string, any> = {
      user_id : options.user_id,
      type    : platform,
    }

    if (platform === "showroom" && room_id) {
      existing_query.room_id = room_id
    } else {
      existing_query.username = username
    }

    let existing = await db.find_one<notification_subscription>(NOTIFICATION_COLLECTION, existing_query)
    if (!existing && platform === "idn") {
      const fallback_query: Record<string, any> = {
        user_id  : options.user_id,
        username : username,
      }
      existing = await db.find_one<notification_subscription>(NOTIFICATION_COLLECTION, fallback_query)
    }

    if (existing) {
      return {
        success : false,
        error   : `You are already subscribed to notifications for ${member_name}.`,
      }
    }

    await db.insert_one<notification_subscription>(NOTIFICATION_COLLECTION, {
      user_id     : options.user_id,
      member_name : member_name,
      username    : username,
      slug        : slug,
      room_id     : room_id,
      type        : platform,
      created_at  : Date.now(),
    })

    return {
      success : true,
      message : `Successfully subscribed to ${member_name} live notifications (${platform.toUpperCase()})! You will receive a DM when they go live.`,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "add_idn_notification", {
      user_id     : options.user_id,
      member_name : options.member_name,
      type        : options.type,
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
export async function remove_notification(options: { user_id: string; member_name: string; client: Client; type?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const platform          = normalize_live_platform(options.type || "idn")
    const fallback_username = normalize_idn_username(options.member_name)
    let member_name         = format_member_display_name(options.member_name.trim())
    let username            = fallback_username
    let room_id             = undefined as number | undefined

    if (platform === "idn") {
      const member = await idn_live.get_member_by_name(options.member_name, options.client)
      const raw_member_name = member?.name || options.member_name.trim()
      member_name = format_member_display_name(raw_member_name)
      username    = member?.username || fallback_username
    }

    if (platform === "showroom") {
      const member = await showroom_live.get_showroom_member_by_name(options.member_name, options.client)
      const raw_member_name = member?.name || options.member_name.trim()
      member_name = format_member_display_name(raw_member_name)
      username    = member?.name || options.member_name.trim()
      room_id     = member?.room_id
    }

    const delete_query: Record<string, any> = {
      user_id : options.user_id,
      type    : platform,
    }

    if (platform === "showroom" && room_id) {
      delete_query.room_id = room_id
    } else {
      delete_query.username = username
    }

    let result = await db.delete_one(NOTIFICATION_COLLECTION, delete_query)
    if (!result && platform === "idn") {
      const fallback_query: Record<string, any> = {
        user_id  : options.user_id,
        username : username,
      }
      result = await db.delete_one(NOTIFICATION_COLLECTION, fallback_query)
    }

    if (!result) {
      return {
        success : false,
        error   : `You are not subscribed to ${member_name}.`,
      }
    }

    return {
      success : true,
      message : `Successfully unsubscribed from ${member_name} live notifications (${platform.toUpperCase()}).`,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "remove_idn_notification", {
      user_id     : options.user_id,
      member_name : options.member_name,
      type        : options.type,
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
 * @param {Client} client - Discord client
 * @returns {Promise<notification_subscription[]>} List of subscriptions
 */
export async function get_user_subscriptions(user_id: string, client: Client): Promise<notification_subscription[]> {
  try {
    return await db.find_many<notification_subscription>(NOTIFICATION_COLLECTION, { user_id })
  } catch (error) {
    await log_error(client, error as Error, "idn_live_get_subscriptions", { user_id })
    return []
  }
}

/**
 * - GET MEMBER SUGGESTIONS - \\
 * @param {object} options - Suggestion options
 * @returns {Promise<member_suggestion[]>} Suggestions for autocomplete
 */
export async function get_member_suggestions(options: { query: string; user_id: string; client: Client; include_live?: boolean; platform?: string }): Promise<member_suggestion[]> {
  try {
    const normalized_query = options.query.toLowerCase().trim()
    const platform         = normalize_live_platform(options.platform || "idn")
    const suggestions_map  = new Map<string, member_suggestion>()

    if (options.include_live !== false) {
      if (platform === "idn") {
        const roster_members = await idn_live.get_idn_roster_members(options.client)
        for (const member of roster_members) {
          const key   = member.username.toLowerCase()
          const label = `${format_member_display_name(member.name)} (@${member.username})`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.username })
          }
        }

        const live_members = await idn_live.get_all_members(options.client)
        for (const member of live_members) {
          const key   = member.username.toLowerCase()
          const label = `${format_member_display_name(member.name)} (@${member.username})`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.username })
          }
        }
      }

      if (platform === "showroom") {
        const showroom_members = await showroom_live.fetch_showroom_members(options.client)
        for (const member of showroom_members) {
          const key   = member.room_id.toString()
          const label = `${format_member_display_name(member.name)} (Showroom)`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.name })
          }
        }
      }
    }

    const subscriptions = await get_user_subscriptions(options.user_id, options.client)
    for (const subscription of subscriptions) {
      if (normalize_live_platform(subscription.type || "idn") !== platform) continue
      const key   = subscription.username.toLowerCase()
      const label = platform === "showroom"
        ? `${format_member_display_name(subscription.member_name)} (Showroom)`
        : `${format_member_display_name(subscription.member_name)} (@${subscription.username})`
      if (!suggestions_map.has(key)) {
        suggestions_map.set(key, { name: label, value: subscription.username })
      }
    }

    const all_suggestions = Array.from(suggestions_map.values())
    const filtered = normalized_query
      ? all_suggestions.filter((suggestion) => {
          const name_match  = suggestion.name.toLowerCase().includes(normalized_query)
          const value_match = suggestion.value.toLowerCase().includes(normalized_query)
          return name_match || value_match
        })
      : all_suggestions

    const limited = filtered.slice(0, 24)
    const has_exact = normalized_query
      ? limited.some((suggestion) => suggestion.value.toLowerCase() === normalized_query)
      : true

    if (normalized_query && !has_exact && limited.length < 25) {
      const display_name = format_member_display_name(to_title_case(options.query))
      limited.unshift({ name: display_name, value: options.query })
    }

    return limited.slice(0, 25)
  } catch (error) {
    await log_error(options.client, error as Error, "idn_live_get_member_suggestions", {
      query   : options.query,
      user_id : options.user_id,
      platform: options.platform,
    })
    return []
  }
}

/**
 * - GET CURRENTLY LIVE MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<object>} Result with live rooms data
 */
export async function get_currently_live(client: Client): Promise<{ success: boolean; data?: idn_live.live_room[]; error?: string }> {
  try {
    const live_rooms = await idn_live.get_live_rooms(client)

    return {
      success : true,
      data    : live_rooms,
    }
  } catch (error) {
    await log_error(client, error as Error, "idn_live_get_currently_live", {})
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
    const idn_live_rooms      = await idn_live.get_live_rooms(client)
    const showroom_live_rooms = await showroom_live.fetch_showroom_live_rooms(client)

    await handle_notify_for_idn(client, idn_live_rooms)
    await handle_notify_for_showroom(client, showroom_live_rooms)

    await cleanup_live_state(client, "idn", idn_live_rooms.map((room) => `idn:${room.slug}`))
    await cleanup_live_state(client, "showroom", showroom_live_rooms.map((room) => `showroom:${room.room_id}`))
  } catch (error) {
    await log_error(client, error as Error, "idn_live_check_and_notify", {})
  }
}

/**
 * - HANDLE IDN LIVE NOTIFICATIONS - \\
 * @param {Client} client - Discord client
 * @param {idn_live.live_room[]} live_rooms - Live rooms
 * @returns {Promise<void>}
 */
async function handle_notify_for_idn(client: Client, live_rooms: idn_live.live_room[]): Promise<void> {
  for (const room of live_rooms) {
    const live_key = `idn:${room.slug}`
    const existing_state = await db.find_one<live_state_record>(LIVE_STATE_COLLECTION, {
      live_key : live_key,
      is_live  : true,
    })
    const legacy_state = await db.find_one<live_state_record>(LIVE_STATE_COLLECTION, {
      slug    : room.slug,
      is_live : true,
    })

    if (existing_state || legacy_state) continue

    const subscriptions = await db.find_many<notification_subscription>(NOTIFICATION_COLLECTION, {
      username : room.username,
    })

    const filtered_subscriptions = subscriptions.filter((subscription) => {
      return normalize_live_platform(subscription.type || "idn") === "idn"
    })

    if (filtered_subscriptions.length === 0) continue

    const notified_users: string[] = []

    for (const subscription of filtered_subscriptions) {
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
        await log_error(client, error as Error, "idn_live_notify_user", {
          user_id     : subscription.user_id,
          member_name : room.member_name,
          slug        : room.slug,
        })
      }
    }

    await db.insert_one<live_state_record>(LIVE_STATE_COLLECTION, {
      slug       : room.slug,
      username   : room.username,
      is_live    : true,
      started_at : room.started_at,
      notified   : notified_users,
      type       : "idn",
      live_key   : live_key,
    })
  }
}

/**
 * - HANDLE SHOWROOM LIVE NOTIFICATIONS - \\
 * @param {Client} client - Discord client
 * @param {showroom_live.showroom_live_room[]} live_rooms - Live rooms
 * @returns {Promise<void>}
 */
async function handle_notify_for_showroom(client: Client, live_rooms: showroom_live.showroom_live_room[]): Promise<void> {
  for (const room of live_rooms) {
    const live_key = `showroom:${room.room_id}`
    const existing_state = await db.find_one<live_state_record>(LIVE_STATE_COLLECTION, {
      live_key : live_key,
      is_live  : true,
    })

    if (existing_state) continue

    const subscriptions = await db.find_many<notification_subscription>(NOTIFICATION_COLLECTION, {
      type    : "showroom",
      room_id : room.room_id,
    })

    if (subscriptions.length === 0) continue

    const notified_users: string[] = []

    for (const subscription of subscriptions) {
      try {
        const user = await client.users.fetch(subscription.user_id)

        const message = component.build_message({
          components: [
            showroom_live.format_showroom_live_component(room),
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

        console.log(`[ - SHOWROOM LIVE - ] Notified ${subscription.user_id} about ${room.member_name} live`)
      } catch (error) {
        await log_error(client, error as Error, "showroom_live_notify_user", {
          user_id     : subscription.user_id,
          member_name : room.member_name,
          room_id     : room.room_id,
        })
      }
    }

    await db.insert_one<live_state_record>(LIVE_STATE_COLLECTION, {
      slug       : "",
      room_id    : room.room_id,
      username   : room.member_name,
      is_live    : true,
      started_at : room.started_at,
      notified   : notified_users,
      type       : "showroom",
      live_key   : live_key,
    })
  }
}

/**
 * - CLEANUP LIVE STATE - \\
 * @param {Client} client - Discord client
 * @param {live_platform} platform - Live platform
 * @param {string[]} active_keys - Active live keys
 * @returns {Promise<void>}
 */
async function cleanup_live_state(client: Client, platform: live_platform, active_keys: string[]): Promise<void> {
  const active_states = await db.find_many<live_state_record>(LIVE_STATE_COLLECTION, {
    is_live : true,
  })

  for (const state of active_states) {
    if (normalize_live_platform(state.type || "idn") !== platform) continue
    if (!active_keys.includes(state.live_key)) {
      await db.delete_one(LIVE_STATE_COLLECTION, { _id: state._id })
      console.log(`[ - ${platform.toUpperCase()} LIVE - ] Stream ended for ${state.username}`)
    }
  }
}

/**
 * - START LIVE MONITORING - \\
 * @param {Client} client - Discord client
 * @param {number} interval_ms - Check interval in milliseconds
 * @returns {NodeJS.Timeout} Interval timer
 */
export function start_live_monitoring(client: Client, interval_ms: number = 60000): NodeJS.Timeout {
  console.log(`[ - LIVE MONITOR - ] Starting IDN + Showroom monitoring every ${interval_ms / 1000}s`)

  check_and_notify_live_changes(client)

  return setInterval(() => {
    check_and_notify_live_changes(client)
  }, interval_ms)
}
