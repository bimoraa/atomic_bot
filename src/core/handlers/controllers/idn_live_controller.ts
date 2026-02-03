import axios              from "axios"
import { Client }         from "discord.js"
import { db, component }  from "../../../shared/utils"
import { log_error }      from "../../../shared/utils/error_logger"
import * as idn_live      from "../../../infrastructure/api/idn_live"
import * as showroom_live from "../../../infrastructure/api/showroom_live"

const NOTIFICATION_COLLECTION = "idn_live_notifications"
const LIVE_STATE_COLLECTION   = "idn_live_state"
const LIVE_NOTIFICATION_CHANNEL_ID = "1468291039889588326"
const HISTORY_API_BASE = process.env.JKT48_HISTORY_API_BASE || ""

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
  member_name?: string
  is_live   : boolean
  started_at: number
  title?    : string
  url?      : string
  image?    : string
  viewers?  : number
  notified  : string[]
  type      : string
  live_key  : string
}

interface live_history_record {
  _id?         : any
  platform     : string
  member_name  : string
  title        : string
  url          : string
  image        : string
  viewers      : number
  comments     : number
  comment_users: number
  total_gold   : number
  started_at   : number
  ended_at     : number
  duration_ms  : number
}

interface member_suggestion {
  name  : string
  value : string
}

type live_platform = "idn" | "showroom"

/**
 * - SEND LIVE NOTIFICATION TO CHANNEL - \\
 * @param {Client} client - Discord client
 * @param {object} message - Message payload
 * @param {string} platform - Platform name
 * @param {string} live_key - Live key
 * @returns {Promise<void>}
 */
async function send_live_channel_notification(client: Client, message: object, platform: string, live_key: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(LIVE_NOTIFICATION_CHANNEL_ID)
    if (!channel || !("send" in channel)) {
      throw new Error("Channel not found or not sendable")
    }

    await (channel as any).send(message)
    console.log(`[ - ${platform.toUpperCase()} LIVE - ] Sent channel notification for ${live_key}`)
  } catch (error) {
    await log_error(client, error as Error, "live_channel_notify", {
      platform : platform,
      live_key : live_key,
      channel_id: LIVE_NOTIFICATION_CHANNEL_ID,
    })
  }
}

/**
 * - BUILD LIVE DM MESSAGE - \\
 * @param {object} options - Message options
 * @param {string} options.member_name - Member name
 * @param {number} options.viewers - Viewer count
 * @param {number} options.started_at - Started timestamp
 * @param {string} options.url - Stream URL
 * @param {string} options.image - Thumbnail image
 * @param {string} options.platform - Platform label
 * @returns {object} Message payload
 */
function build_live_dm_message(options: {
  member_name : string
  viewers     : number
  started_at  : number
  url         : string
  image       : string
  platform    : string
}): object {
  const started_timestamp = Math.floor(options.started_at / 1000)

  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content   : `## Oshi Kamu ${options.member_name} Lagi Live nih!`,
            accessory : component.link_button("Watch", options.url),
          }),
          component.divider(2),
          component.section({
            content: [
              `- **Viewers:** ${options.viewers.toLocaleString()}`,
              `- **Started:** <t:${started_timestamp}:R>`,
              `- **Watch URL:** ${options.url}`,
              `- **Platform**: ${options.platform}`,
            ],
            accessory : options.image ? component.thumbnail(options.image) : undefined,
          }),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.link_button("Tonton Live", options.url)
          ),
        ],
      }),
    ],
  })
}

/**
 * - BUILD LIVE CHANNEL MESSAGE - \\
 * @param {object} options - Message options
 * @param {string} options.member_name - Member name
 * @param {number} options.viewers - Viewer count
 * @param {number} options.started_at - Started timestamp
 * @param {string} options.url - Stream URL
 * @param {string} options.image - Thumbnail image
 * @param {string} options.platform - Platform label
 * @returns {object} Message payload
 */
function build_live_channel_message(options: {
  member_name : string
  viewers     : number
  started_at  : number
  url         : string
  image       : string
  platform    : string
}): object {
  const started_timestamp = Math.floor(options.started_at / 1000)

  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content   : `## ${options.member_name} Lagi Live nih!`,
            accessory : component.link_button("Watch", options.url),
          }),
          component.divider(2),
          component.section({
            content: [
              `- **Viewers:** ${options.viewers.toLocaleString()}`,
              `- **Started:** <t:${started_timestamp}:R>`,
              `- **Watch URL:** ${options.url}`,
              `- **Platform**: ${options.platform}`,
            ],
            accessory : options.image ? component.thumbnail(options.image) : undefined,
          }),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.link_button("Tonton Live", options.url)
          ),
        ],
      }),
    ],
  })
}

/**
 * - BUILD HISTORY API URL - \\
 * @param {string} path - Path
 * @returns {string} Full URL
 */
function build_history_url(path: string): string {
  const base = HISTORY_API_BASE.replace(/\/+$/, "")
  if (!base) return ""
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`
}

/**
 * - FETCH SHOWROOM HISTORY - \\
 * @param {Client} client - Discord client
 * @param {number} room_id - Showroom room ID
 * @returns {Promise<Partial<live_history_record>>} History data
 */
async function fetch_showroom_history(client: Client, room_id: number): Promise<Partial<live_history_record>> {
  if (!HISTORY_API_BASE || !room_id) {
    return {}
  }

  try {
    const recent_url = build_history_url("/recent")
    const recent_response = await axios.get(recent_url, {
      timeout : 15000,
      params  : {
        type    : "showroom",
        room_id : room_id,
        perpage : 1,
        order   : -1,
        sort    : "date",
      },
    })

    const recents = recent_response.data?.recents || []
    const recent = Array.isArray(recents) ? recents[0] : null
    if (!recent?.data_id) {
      return {}
    }

    const detail_url = build_history_url(`/recent/${recent.data_id}`)
    const detail_response = await axios.get(detail_url, { timeout: 15000 })
    const detail = detail_response.data || {}
    const comments = detail?.live_info?.comments

    return {
      comments      : Number(comments?.num || 0),
      comment_users : Number(comments?.users || 0),
      total_gold    : Number(detail?.total_point || detail?.total_gifts || recent?.points || 0),
      started_at    : detail?.live_info?.date?.start ? new Date(detail.live_info.date.start).getTime() : undefined,
      ended_at      : detail?.live_info?.date?.end ? new Date(detail.live_info.date.end).getTime() : undefined,
    }
  } catch (error) {
    await log_error(client, error as Error, "showroom_history_fetch", {
      room_id : room_id,
    })
    return {}
  }
}

/**
 * - FETCH IDN HISTORY - \\
 * @param {Client} client - Discord client
 * @param {string} slug - IDN live slug
 * @returns {Promise<Partial<live_history_record>>} History data
 */
async function fetch_idn_history(client: Client, slug: string): Promise<Partial<live_history_record>> {
  if (!slug) {
    return {}
  }

  try {
    const response = await axios.get(`https://api.idn.app/api/v4/livestream/${slug}`, {
      timeout : 15000,
      headers : {
        "User-Agent" : "Android/14/SM-A528B/6.47.4",
        "x-api-key"  : "123f4c4e-6ce1-404d-8786-d17e46d65b5c",
      },
    })

    const detail = response.data?.data || response.data || {}
    const creator = detail?.creator || {}
    const comments = detail?.comments
      || detail?.comment
      || detail?.comment_count
      || detail?.total_comment
      || detail?.total_comments
      || detail?.chat_count
      || detail?.chat_room_count
      || 0

    return {
      total_gold    : Number(creator?.total_gold || 0),
      comments      : Number(comments || 0),
      comment_users : Number(detail?.comment_users || 0),
      started_at    : detail?.live_at ? Number(detail.live_at) * 1000 : undefined,
      ended_at      : detail?.end_at ? Number(detail.end_at) * 1000 : undefined,
    }
  } catch (error) {
    await log_error(client, error as Error, "idn_history_fetch", {
      slug : slug,
    })
    return {}
  }
}

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
    const input_trimmed     = options.member_name.trim()
    const parsed_room_id    = /^\d+$/.test(input_trimmed) ? Number(input_trimmed) : undefined
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
      const raw_member_name = member?.name || input_trimmed
      const resolved_room_id = member?.room_id || parsed_room_id
      member_name = resolved_room_id && !member?.room_id
        ? `Showroom Room ${resolved_room_id}`
        : format_member_display_name(raw_member_name)
      room_id  = resolved_room_id
      username = member?.name || input_trimmed
      slug        = ""
    }

    if (!username || (platform === "showroom" && !room_id)) {
      return {
        success : false,
        error   : platform === "showroom"
          ? "Please provide a valid Showroom member name or room ID."
          : "Please provide a valid IDN member name or username.",
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
    const input_trimmed     = options.member_name.trim()
    const parsed_room_id    = /^\d+$/.test(input_trimmed) ? Number(input_trimmed) : undefined
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
      const raw_member_name = member?.name || input_trimmed
      const resolved_room_id = member?.room_id || parsed_room_id
      member_name = resolved_room_id && !member?.room_id
        ? `Showroom Room ${resolved_room_id}`
        : format_member_display_name(raw_member_name)
      username = member?.name || input_trimmed
      room_id  = resolved_room_id
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
        const roster_members = await idn_live.get_idn_roster_members(options.client, {
          max_wait_ms : 2000,
          allow_stale : true,
        })
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

    await cleanup_live_state(client, "idn", idn_live_rooms.map((room) => `idn:${room.slug || room.username}`))
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
    const live_key = `idn:${room.slug || room.username}`
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

    const channel_message = build_live_channel_message({
      member_name : room.member_name,
      viewers     : room.viewers,
      started_at  : room.started_at,
      url         : room.url,
      image       : room.image,
      platform    : "IDN Live",
    })

    await send_live_channel_notification(client, channel_message, "idn", live_key)

    const notified_users: string[] = []

    for (const subscription of filtered_subscriptions) {
      try {
        const user = await client.users.fetch(subscription.user_id)

        const message = build_live_dm_message({
          member_name : room.member_name,
          viewers     : room.viewers,
          started_at  : room.started_at,
          url         : room.url,
          image       : room.image,
          platform    : "IDN Live",
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
      member_name: room.member_name,
      title      : room.title,
      url        : room.url,
      image      : room.image,
      viewers    : room.viewers,
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

    const channel_message = build_live_channel_message({
      member_name : room.member_name,
      viewers     : room.viewers,
      started_at  : room.started_at,
      url         : room.url,
      image       : room.image,
      platform    : "Showroom",
    })

    await send_live_channel_notification(client, channel_message, "showroom", live_key)

    const notified_users: string[] = []

    for (const subscription of subscriptions) {
      try {
        const user = await client.users.fetch(subscription.user_id)

        const message = build_live_dm_message({
          member_name : room.member_name,
          viewers     : room.viewers,
          started_at  : room.started_at,
          url         : room.url,
          image       : room.image,
          platform    : "Showroom",
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
      member_name: room.member_name,
      title      : room.title,
      url        : room.url,
      image      : room.image,
      viewers    : room.viewers,
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
      const ended_at = Date.now()
      const platform_label = platform === "showroom" ? "showroom" : "idn"
      const base_record: live_history_record = {
        platform      : platform_label,
        member_name   : state.member_name || state.username || "Unknown",
        title         : state.title || "",
        url           : state.url || "",
        image         : state.image || "",
        viewers       : state.viewers || 0,
        comments      : 0,
        comment_users : 0,
        total_gold    : 0,
        started_at    : state.started_at || ended_at,
        ended_at      : ended_at,
        duration_ms   : 0,
      }

      const enrich = platform === "showroom"
        ? await fetch_showroom_history(client, state.room_id || 0)
        : await fetch_idn_history(client, state.slug || "")

      const final_started_at = enrich.started_at || base_record.started_at
      const final_ended_at = enrich.ended_at || base_record.ended_at
      const duration_ms = Math.max(0, final_ended_at - final_started_at)

      const history_record: live_history_record = {
        ...base_record,
        comments      : enrich.comments ?? base_record.comments,
        comment_users : enrich.comment_users ?? base_record.comment_users,
        total_gold    : enrich.total_gold ?? base_record.total_gold,
        started_at    : final_started_at,
        ended_at      : final_ended_at,
        duration_ms   : duration_ms,
      }

      await db.insert_one<live_history_record>("live_history", history_record)
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
