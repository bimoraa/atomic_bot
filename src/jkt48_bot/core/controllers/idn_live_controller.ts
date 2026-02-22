import axios              from "axios"
import { Client }         from "discord.js"
import { db, component }  from "@shared/utils"
import { log_error }      from "@shared/utils/error_logger"
import { Cache }          from "@shared/utils/cache"
import * as idn_live      from "../../infrastructure/api/idn_live"
import * as showroom_live from "../../infrastructure/api/showroom_live"

const __notification_collection        = "idn_live_notifications"
const __live_state_collection          = "idn_live_state"
const __guild_notification_settings    = "jkt48_guild_notification_settings"
const __history_api_base               = process.env.JKT48_HISTORY_API_BASE || ""
const __idn_fallback_cooldown_ms       = 30 * 60 * 1000
const __idn_fallback_rate_limit_ms     = 5 * 60 * 1000
const __history_request_timeout_ms     = 25000
const __history_request_retry_count    = 3
const __history_request_retry_delay_ms = 1200
let __history_base_warned            = false
let __idn_fallback_disabled_until    = 0

/**
 * - WAIT FOR N MILLISECONDS - \\
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>} Promise
 */
function wait_ms(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * - CHECK RETRYABLE REQUEST ERROR - \\
 * @param {any} error - Request error
 * @returns {boolean} Is retryable
 */
function is_retryable_request_error(error: any): boolean {
  const status  = Number(error?.response?.status || 0)
  const code    = String(error?.code || "").toUpperCase()
  const message = String(error?.message || "").toLowerCase()

  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true
  }

  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENOTFOUND", "ERR_NETWORK", "ERR_SOCKET_TIMEOUT"].includes(code)) {
    return true
  }

  return message.includes("timeout") || message.includes("socket hang up")
}

/**
 * - AXIOS GET WITH RETRY - \\
 * @param {string} url - Request URL
 * @param {Record<string, any>} config - Axios config
 * @returns {Promise<any>} Axios response
 */
async function axios_get_with_retry(url: string, config: Record<string, any> = {}): Promise<any> {
  let attempt    = 0
  let last_error = null as any

  while (attempt < __history_request_retry_count) {
    try {
      return await axios.get(url, {
        timeout : __history_request_timeout_ms,
        ...config,
      })
    } catch (error) {
      last_error = error
      attempt += 1

      if (!is_retryable_request_error(error) || attempt >= __history_request_retry_count) {
        throw error
      }

      const delay_ms = __history_request_retry_delay_ms * attempt
      await wait_ms(delay_ms)
    }
  }

  throw last_error as Error
}

/**
 * - PICK FIRST VALID NUMBER - \\
 * @param {Array<any>} candidates - Number candidates
 * @returns {number | undefined} Parsed number
 */
function pick_number(candidates: Array<any>): number | undefined {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue
    const value = typeof candidate === "number" ? candidate : Number(candidate)
    if (!Number.isNaN(value) && Number.isFinite(value)) {
      return value
    }
  }
  return undefined
}

/**
 * - BUILD HISTORY DEBUG PAYLOAD - \\
 * @param {object} payload - Raw payload
 * @returns {object} Sanitized payload
 */
function build_history_debug_payload(payload: {
  recent?: any
  detail?: any
  source?: string
  extra?: Record<string, any>
}): Record<string, any> {
  const detail = payload.detail || {}
  const recent = payload.recent || {}

  return {
    source : payload.source,
    recent : {
      data_id   : recent?.data_id,
      points    : recent?.points || recent?.point,
      viewers   : recent?.viewers || recent?.view_count,
      comments  : recent?.comment_count || recent?.comments,
      timestamp : recent?.date || recent?.time || recent?.created_at,
    },
    detail : {
      live_info : detail?.live_info,
      stats     : detail?.stats,
      summary   : detail?.summary,
      total     : {
        total_gold    : detail?.total_gold || detail?.total_point || detail?.total_points || detail?.total_gifts,
        comment_count : detail?.comment_count || detail?.comments_count || detail?.total_comment || detail?.total_comments,
        viewer_count  : detail?.viewer_count || detail?.view_count || detail?.viewers,
      },
    },
    extra  : payload.extra || {},
  }
}

/**
 * - FETCH IDN HISTORY STATS FALLBACK - \\
 * @param {Client} client - Discord client
 * @param {string} slug - IDN live slug
 * @param {string} uuid - IDN creator UUID
 * @returns {Promise<Record<string, any>>} Stats payload
 */
async function fetch_idn_stats_fallback(client: Client, slug: string, uuid: string): Promise<Record<string, any>> {
  if (!uuid) {
    return {}
  }

  if (Date.now() < __idn_fallback_disabled_until) {
    return {}
  }

  const endpoint = "https://mobile-api.idn.app/v3/profile/livestreams"

  try {
    const response = await axios_get_with_retry(endpoint, {
      params  : {
        uuid : uuid,
      },
      headers : {
        "User-Agent" : "IDN/6.41.1 (com.idntimes.IDNTimes; build:745; iOS 17.2.1) Alamofire/5.1.0",
        "Accept"     : "application/json",
      },
    })

    const livestreams = Array.isArray(response.data?.data) ? response.data.data : []
    const matched_live = livestreams.find((item: any) => item?.slug === slug)
      || livestreams[0]

    if (!matched_live) {
      return {}
    }

    return {
      ...matched_live,
      viewers      : pick_number([matched_live?.view_count, matched_live?.viewer_count]),
      viewer_count : pick_number([matched_live?.view_count, matched_live?.viewer_count]),
      view_count   : pick_number([matched_live?.view_count, matched_live?.viewer_count]),
    }
  } catch (error) {
    const status          = Number((error as any)?.response?.status || 0)
    const message         = (error as any)?.response?.data?.message || (error as Error).message
    const expected_status = [401, 403, 404]

    if (expected_status.includes(status)) {
      __idn_fallback_disabled_until = Date.now() + __idn_fallback_cooldown_ms
      return {}
    }

    if (status === 429) {
      __idn_fallback_disabled_until = Date.now() + __idn_fallback_rate_limit_ms
      return {}
    }

    await log_error(client, error as Error, "idn_history_stats_fetch", {
      slug               : slug,
      uuid               : uuid,
      endpoint           : `${endpoint}?uuid=${uuid}`,
      status             : status || undefined,
      message            : message,
      fallback_cooldown  : __idn_fallback_disabled_until,
    })

    return {}
  }
}

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
  live_key?    : string
}

interface member_suggestion {
  name  : string
  value : string
}

type live_platform = "idn" | "showroom"

// - IN-MEMORY CACHE FOR LIVE STATE — AVOIDS DB ROUND-TRIP ON EVERY 60S POLL CYCLE - \\
const live_state_cache = new Cache<live_state_record>(2 * 60 * 1000, 200, 60 * 1000, "live_state")

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
    // - GET ALL GUILDS WITH NOTIFICATION SETTINGS FOR THIS PLATFORM - \\
    const guild_settings = await db.find_many<{
      guild_id   : string
      channel_id : string
      platform   : string
    }>(__guild_notification_settings, { platform: platform })

    if (guild_settings.length === 0) {
      console.log(`[ - ${platform.toUpperCase()} LIVE - ] No guilds configured for notifications`)
      return
    }

    // - SEND TO ALL CONFIGURED CHANNELS IN PARALLEL - \\
    await Promise.all(
      guild_settings.map(async (setting) => {
        try {
          const channel = client.channels.cache.get(setting.channel_id)
            || await client.channels.fetch(setting.channel_id).catch(() => null)

          if (!channel || !("send" in channel)) {
            console.warn(`[ - ${platform.toUpperCase()} LIVE - ] Channel ${setting.channel_id} not found or not sendable in guild ${setting.guild_id}`)
            return
          }

          await (channel as any).send(message)
          console.log(`[ - ${platform.toUpperCase()} LIVE - ] Sent notification to guild ${setting.guild_id} channel ${setting.channel_id} for ${live_key}`)
        } catch (error) {
          await log_error(client, error as Error, "live_channel_notify", {
            platform   : platform,
            live_key   : live_key,
            guild_id   : setting.guild_id,
            channel_id : setting.channel_id,
          })
        }
      })
    )
  } catch (error) {
    await log_error(client, error as Error, "live_channel_notify_fetch_settings", {
      platform : platform,
      live_key : live_key,
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
  const base = __history_api_base.replace(/\/+$/, "")
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
  if (!room_id) {
    return {}
  }

  if (!__history_api_base) {
    if (!__history_base_warned) {
      __history_base_warned = true
      await log_error(client, new Error("History API base not configured"), "showroom_history_config", {
        env_key : "JKT48_HISTORY_API_BASE",
      })
    }

    const fallback_metrics = await showroom_live.fetch_showroom_history_metrics(client, room_id)
    return {
      comments      : fallback_metrics.comments ?? 0,
      comment_users : fallback_metrics.comment_users ?? 0,
      total_gold    : fallback_metrics.total_gold ?? 0,
      viewers       : fallback_metrics.viewers ?? 0,
      started_at    : fallback_metrics.started_at,
      ended_at      : fallback_metrics.ended_at,
    }
  }

  try {
    const recent_url = build_history_url("/recent")
    const recent_response = await axios_get_with_retry(recent_url, {
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
    const detail_response = await axios_get_with_retry(detail_url)
    const detail = detail_response.data || {}
    const comments = detail?.live_info?.comments
    const viewers = detail?.live_info?.viewers

    const comments_value = pick_number([
      comments?.num,
      comments?.count,
      detail?.comment_count,
      detail?.comments_count,
      detail?.total_comment,
      detail?.total_comments,
      detail?.chat_count,
      detail?.chat_room_count,
      recent?.comment_count,
      recent?.comments,
    ])

    const comment_users_value = pick_number([
      comments?.users,
      comments?.user,
      detail?.comment_users,
      detail?.unique_commenters,
      detail?.unique_commenter,
      detail?.unique_users,
      recent?.comment_users,
    ])

    const total_gold_value = pick_number([
      detail?.total_point,
      detail?.total_points,
      detail?.total_gifts,
      detail?.total_gold,
      detail?.point,
      recent?.points,
      recent?.point,
      recent?.total_point,
    ])

    const viewers_value = pick_number([
      viewers?.num,
      viewers?.peak,
      viewers?.active,
      detail?.viewers,
      detail?.viewer_count,
      detail?.view_count,
      recent?.viewers,
    ])

    if (!comments_value && !comment_users_value && !total_gold_value && !viewers_value) {
      await log_error(client, new Error("Showroom history metrics empty"), "showroom_history_metrics_empty", build_history_debug_payload({
        recent : recent,
        detail : detail,
        source : "history_api",
        extra  : { room_id: room_id },
      }))
    }

    if (!comments_value && !comment_users_value && !total_gold_value && !viewers_value) {
      const fallback_metrics = await showroom_live.fetch_showroom_history_metrics(client, room_id)
      return {
        comments      : fallback_metrics.comments ?? 0,
        comment_users : fallback_metrics.comment_users ?? 0,
        total_gold    : fallback_metrics.total_gold ?? 0,
        viewers       : fallback_metrics.viewers ?? 0,
        started_at    : fallback_metrics.started_at ?? (detail?.live_info?.date?.start ? new Date(detail.live_info.date.start).getTime() : undefined),
        ended_at      : fallback_metrics.ended_at ?? (detail?.live_info?.date?.end ? new Date(detail.live_info.date.end).getTime() : undefined),
      }
    }

    return {
      comments      : comments_value ?? 0,
      comment_users : comment_users_value ?? 0,
      total_gold    : total_gold_value ?? 0,
      viewers       : viewers_value ?? 0,
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
 * @param {string} [uuid] - IDN creator UUID
 * @returns {Promise<Partial<live_history_record>>} History data
 */
async function fetch_idn_history(client: Client, slug: string, uuid?: string): Promise<Partial<live_history_record>> {
  if (!slug) {
    return {}
  }

  let detail: any = {}
  let creator: any = {}
  let stats: any = {}
  let fallback_payload: Record<string, any> | null = null

  try {
    const response = await axios_get_with_retry(`https://api.idn.app/api/v4/livestream/${slug}`, {
      headers : {
        "User-Agent" : "Android/14/SM-A528B/6.47.4",
        "x-api-key"  : "123f4c4e-6ce1-404d-8786-d17e46d65b5c",
      },
    })

    detail = response.data?.data || response.data || {}
    creator = detail?.creator || {}
    stats = detail?.stats || detail?.live_stats || detail?.statistics
  } catch (error) {
    await log_error(client, error as Error, "idn_history_fetch", {
      slug : slug,
    })
    
    if (uuid) {
      fallback_payload = await fetch_idn_stats_fallback(client, slug, uuid)
    }
  }

  try {
    const comments_value = pick_number([
      detail?.comments,
      detail?.comment,
      detail?.comment_count,
      detail?.total_comment,
      detail?.total_comments,
      detail?.chat_count,
      detail?.chat_room_count,
      stats?.comment_count,
      stats?.comments,
      stats?.total_comment,
      stats?.total_comments,
    ])

    const comment_users_value = pick_number([
      detail?.comment_users,
      detail?.unique_commenters,
      detail?.unique_commenter,
      detail?.unique_users,
      stats?.comment_users,
      stats?.unique_commenters,
    ])

    const viewers_value = pick_number([
      detail?.view_count,
      detail?.viewer_count,
      detail?.viewers,
      detail?.views,
      stats?.view_count,
      stats?.viewer_count,
      stats?.viewers,
    ])

    const stream_total_gold_value = pick_number([
      detail?.total_gold,
      detail?.total_point,
      detail?.total_points,
      detail?.total_gifts,
      stats?.total_gold,
      stats?.total_point,
      stats?.total_points,
      stats?.total_gifts,
    ])
    const creator_total_gold_value = pick_number([
      creator?.total_gold,
    ])

    const should_fetch_fallback = !fallback_payload && (stream_total_gold_value === undefined
      || stream_total_gold_value === null
      || stream_total_gold_value === 0
      || comments_value === undefined
      || comment_users_value === undefined
      || viewers_value === undefined)

    if (should_fetch_fallback) {
      fallback_payload = await fetch_idn_stats_fallback(client, slug, String(creator?.uuid || uuid || ""))
    }

    const fallback_stats = fallback_payload?.stats || fallback_payload?.statistics || fallback_payload

    const fallback_comments = pick_number([
      fallback_stats?.comment_count,
      fallback_stats?.comments,
      fallback_stats?.total_comment,
      fallback_stats?.total_comments,
      fallback_payload?.comment_count,
      fallback_payload?.comments,
    ])

    const fallback_comment_users = pick_number([
      fallback_stats?.comment_users,
      fallback_stats?.unique_commenters,
      fallback_stats?.unique_users,
      fallback_payload?.comment_users,
      fallback_payload?.unique_commenters,
    ])

    const fallback_viewers = pick_number([
      fallback_stats?.view_count,
      fallback_stats?.viewer_count,
      fallback_stats?.viewers,
      fallback_payload?.view_count,
      fallback_payload?.viewer_count,
      fallback_payload?.viewers,
    ])

    const fallback_total_gold = pick_number([
      fallback_stats?.total_gold,
      fallback_stats?.total_point,
      fallback_stats?.total_points,
      fallback_stats?.total_gifts,
      fallback_payload?.total_gold,
      fallback_payload?.total_point,
      fallback_payload?.total_points,
      fallback_payload?.total_gifts,
    ])

    const has_any_metric = [
      comments_value,
      comment_users_value,
      viewers_value,
      stream_total_gold_value,
      creator_total_gold_value,
      fallback_comments,
      fallback_comment_users,
      fallback_viewers,
      fallback_total_gold,
    ].some((value) => value !== undefined && value !== null)

    if (!has_any_metric) {
      await log_error(client, new Error("IDN history metrics empty"), "idn_history_metrics_empty", build_history_debug_payload({
        detail : detail,
        source : "idn_v4",
        extra  : { slug: slug },
      }))
    }

    return {
      total_gold    : stream_total_gold_value ?? fallback_total_gold ?? creator_total_gold_value ?? 0,
      comments      : comments_value ?? fallback_comments ?? 0,
      comment_users : comment_users_value ?? fallback_comment_users ?? 0,
      viewers       : viewers_value ?? fallback_viewers ?? 0,
      started_at    : detail?.live_at ? Number(detail.live_at) * 1000 : undefined,
      ended_at      : detail?.end_at ? Number(detail.end_at) * 1000 : undefined,
    }
  } catch (error) {
    await log_error(client, error as Error, "idn_history_metrics_process", {
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

    let existing = await db.find_one<notification_subscription>(__notification_collection, existing_query)
    if (!existing && platform === "idn") {
      const fallback_query: Record<string, any> = {
        user_id  : options.user_id,
        username : username,
      }
      existing = await db.find_one<notification_subscription>(__notification_collection, fallback_query)
    }

    if (existing) {
      return {
        success : false,
        error   : `You are already subscribed to notifications for ${member_name}.`,
      }
    }

    await db.insert_one<notification_subscription>(__notification_collection, {
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

    let result = await db.delete_one(__notification_collection, delete_query)
    if (!result && platform === "idn") {
      const fallback_query: Record<string, any> = {
        user_id  : options.user_id,
        username : username,
      }
      result = await db.delete_one(__notification_collection, fallback_query)
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
    if (!db.is_connected()) {
      console.warn("[ - JKT48 - ] Database not connected, cannot fetch subscriptions")
      return []
    }
    return await db.find_many<notification_subscription>(__notification_collection, { user_id })
  } catch (error) {
    console.error("[ - JKT48 - ] Failed to fetch subscriptions:", (error as Error).message)
    await log_error(client, error as Error, "idn_live_get_subscriptions", { user_id }).catch(() => {})
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

    // - START SUBSCRIPTION FETCH IMMEDIATELY SO IT RUNS IN PARALLEL - \\
    const subscriptions_promise = get_user_subscriptions(options.user_id, options.client).catch(() => [])

    if (options.include_live !== false) {
      if (platform === "idn") {
        // - ROSTER + LIVE FETCHES ARE INDEPENDENT — RUN IN PARALLEL - \\
        const [roster_members, live_members] = await Promise.all([
          idn_live.get_idn_roster_members(options.client, {
            max_wait_ms : 2000,
            allow_stale : true,
          }).catch((err) => {
            console.error("[ - JKT48 - ] Autocomplete: Failed to fetch roster members:", err.message)
            return []
          }),
          idn_live.get_all_members(options.client).catch((err) => {
            console.error("[ - JKT48 - ] Autocomplete: Failed to fetch live members:", err.message)
            return []
          }),
        ])

        for (const member of roster_members) {
          const key   = member.username.toLowerCase()
          const label = `${format_member_display_name(member.name)} (@${member.username})`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.username })
          }
        }

        for (const member of live_members) {
          const key   = member.username.toLowerCase()
          const label = `${format_member_display_name(member.name)} (@${member.username})`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.username })
          }
        }
      }

      if (platform === "showroom") {
        const showroom_members = await showroom_live.fetch_showroom_members(options.client).catch((err) => {
          console.error("[ - JKT48 - ] Autocomplete: Failed to fetch showroom members:", err.message)
          return []
        })
        for (const member of showroom_members) {
          const key   = member.room_id.toString()
          const label = `${format_member_display_name(member.name)} (Showroom)`
          if (!suggestions_map.has(key)) {
            suggestions_map.set(key, { name: label, value: member.name })
          }
        }
      }
    }

    const subscriptions = await subscriptions_promise
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
    console.error("[ - JKT48 - ] Autocomplete error:", error)
    await log_error(options.client, error as Error, "idn_live_get_member_suggestions", {
      query   : options.query,
      user_id : options.user_id,
      platform: options.platform,
    }).catch(() => {})
    
    // - RETURN FALLBACK SUGGESTIONS INSTEAD OF EMPTY ARRAY - \\
    const fallback_query = options.query.trim()
    if (fallback_query) {
      return [{
        name  : format_member_display_name(to_title_case(fallback_query)),
        value : fallback_query,
      }]
    }
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
    const [idn_live_rooms, showroom_live_rooms] = await Promise.all([
      idn_live.get_live_rooms(client),
      showroom_live.fetch_showroom_live_rooms(client),
    ])

    await Promise.all([
      handle_notify_for_idn(client, idn_live_rooms),
      handle_notify_for_showroom(client, showroom_live_rooms),
    ])

    await sync_active_idn_history(client)

    await Promise.all([
      cleanup_live_state(client, "idn", idn_live_rooms.map((room) => `idn:${room.slug || room.username}`)),
      cleanup_live_state(client, "showroom", showroom_live_rooms.map((room) => `showroom:${room.room_id}`)),
    ])
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

    // - CHECK IN-MEMORY CACHE FIRST — AVOIDS DB ON EVERY POLL CYCLE - \\
    if (live_state_cache.get(live_key)) continue

    const existing_state = await db.find_one<live_state_record>(__live_state_collection, {
      live_key : live_key,
      is_live  : true,
    })
    if (existing_state) {
      live_state_cache.set(live_key, existing_state)
      continue
    }

    const legacy_state = await db.find_one<live_state_record>(__live_state_collection, {
      slug    : room.slug,
      is_live : true,
    })
    if (legacy_state) {
      live_state_cache.set(live_key, legacy_state)
      continue
    }

    const subscriptions = await db.find_many<notification_subscription>(__notification_collection, {
      username : room.username,
    })

    const filtered_subscriptions = subscriptions.filter((sub) => {
      return normalize_live_platform(sub.type || "idn") === "idn"
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

    // - BUILD DM ONCE, SEND TO ALL SUBSCRIBERS IN PARALLEL - \\
    const dm_message = build_live_dm_message({
      member_name : room.member_name,
      viewers     : room.viewers,
      started_at  : room.started_at,
      url         : room.url,
      image       : room.image,
      platform    : "IDN Live",
    })

    const notified_users = (await Promise.all(
      filtered_subscriptions.map(async (sub) => {
        try {
          const user = await client.users.fetch(sub.user_id)
          await user.send(dm_message)
          console.log(`[ - IDN LIVE - ] Notified ${sub.user_id} about ${room.member_name} live`)
          return sub.user_id
        } catch (error) {
          await log_error(client, error as Error, "idn_live_notify_user", {
            user_id     : sub.user_id,
            member_name : room.member_name,
            slug        : room.slug,
          })
          return null
        }
      })
    )).filter((id): id is string => id !== null)

    const state: live_state_record = {
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
    }

    await db.insert_one<live_state_record>(__live_state_collection, state)
    live_state_cache.set(live_key, state)
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

    if (live_state_cache.get(live_key)) continue

    const existing_state = await db.find_one<live_state_record>(__live_state_collection, {
      live_key : live_key,
      is_live  : true,
    })
    if (existing_state) {
      live_state_cache.set(live_key, existing_state)
      continue
    }

    const subscriptions = await db.find_many<notification_subscription>(__notification_collection, {
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

    const dm_message = build_live_dm_message({
      member_name : room.member_name,
      viewers     : room.viewers,
      started_at  : room.started_at,
      url         : room.url,
      image       : room.image,
      platform    : "Showroom",
    })

    const notified_users = (await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const user = await client.users.fetch(sub.user_id)
          await user.send(dm_message)
          console.log(`[ - SHOWROOM LIVE - ] Notified ${sub.user_id} about ${room.member_name} live`)
          return sub.user_id
        } catch (error) {
          await log_error(client, error as Error, "showroom_live_notify_user", {
            user_id     : sub.user_id,
            member_name : room.member_name,
            room_id     : room.room_id,
          })
          return null
        }
      })
    )).filter((id): id is string => id !== null)

    const state: live_state_record = {
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
    }

    await db.insert_one<live_state_record>(__live_state_collection, state)
    live_state_cache.set(live_key, state)
  }
}

/**
 * - SYNC ACTIVE IDN HISTORY - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
async function sync_active_idn_history(client: Client): Promise<void> {
  const active_states = await db.find_many<live_state_record>(__live_state_collection, {
    is_live : true,
    type    : "idn",
  })

  await Promise.all(active_states.map(async (state) => {
    try {
      if (!state.slug) return

      const now_ms      = Date.now()
      const uuid        = idn_live.get_idn_uuid_by_username(state.username) || undefined
      const enrich      = await fetch_idn_history(client, state.slug, uuid)
      const history_key = state.live_key || `idn:${state.slug || state.username || "unknown"}`
      const started_at  = enrich.started_at || state.started_at || now_ms
      const ended_at    = enrich.ended_at || now_ms

      const record: live_history_record = {
        platform      : "idn",
        member_name   : state.member_name || state.username || "Unknown",
        title         : state.title || "",
        url           : state.url || "",
        image         : state.image || "",
        viewers       : enrich.viewers       ?? state.viewers ?? 0,
        comments      : enrich.comments      ?? 0,
        comment_users : enrich.comment_users ?? 0,
        total_gold    : enrich.total_gold    ?? 0,
        started_at    : started_at,
        ended_at      : ended_at,
        duration_ms   : Math.max(0, ended_at - started_at),
        live_key      : history_key,
      }

      await db.update_one<live_history_record>(
        "live_history",
        { live_key: history_key },
        record,
        true
      )
    } catch (error) {
      await log_error(client, error as Error, "idn_live_sync_active_history", {
        slug     : state.slug,
        username : state.username,
        live_key : state.live_key,
      })
    }
  }))
}

/**
 * - CLEANUP LIVE STATE - \\
 * @param {Client} client - Discord client
 * @param {live_platform} platform - Live platform
 * @param {string[]} active_keys - Active live keys
 * @returns {Promise<void>}
 */
async function cleanup_live_state(client: Client, platform: live_platform, active_keys: string[]): Promise<void> {
  const active_key_set = new Set(active_keys)

  // - FILTER BY PLATFORM AT DB LEVEL — ELIMINATES REDUNDANT FULL-TABLE SCAN - \\
  const active_states = await db.find_many<live_state_record>(__live_state_collection, {
    is_live : true,
    type    : platform,
  })

  const ended_states = active_states.filter((state) => !active_key_set.has(state.live_key))

  // - PROCESS ALL ENDED STREAMS IN PARALLEL (HISTORY FETCH + DB OPS) - \\
  await Promise.all(ended_states.map(async (state) => {
    try {
      const ended_at       = Date.now()
      const history_key    = state.live_key || `${platform}:${state.slug || state.username || state.room_id || "unknown"}`
      const base_record: live_history_record = {
        platform      : platform,
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
        live_key      : history_key,
      }

      const enrich = platform === "showroom"
        ? await fetch_showroom_history(client, state.room_id || 0)
        : await fetch_idn_history(client, state.slug || "", idn_live.get_idn_uuid_by_username(state.username) || undefined)

      const final_started_at = enrich.started_at || base_record.started_at
      const final_ended_at   = enrich.ended_at   || base_record.ended_at

      const history_record: live_history_record = {
        ...base_record,
        comments      : enrich.comments      ?? base_record.comments,
        comment_users : enrich.comment_users ?? base_record.comment_users,
        total_gold    : enrich.total_gold    ?? base_record.total_gold,
        viewers       : enrich.viewers       ?? base_record.viewers,
        started_at    : final_started_at,
        ended_at      : final_ended_at,
        duration_ms   : Math.max(0, final_ended_at - final_started_at),
      }

      await db.update_one<live_history_record>(
        "live_history",
        { live_key: history_key },
        history_record,
        true
      )

      // - USE live_key FOR DELETE — _id IS NEVER STORED IN generic_data JSONB - \\
      const delete_filter = state.live_key
        ? { live_key: state.live_key }
        : { slug: state.slug, is_live: true, type: state.type }

      live_state_cache.delete(state.live_key)
      await db.delete_one(__live_state_collection, delete_filter)
      console.log(`[ - ${platform.toUpperCase()} LIVE - ] Stream ended for ${state.username}`)
    } catch (error) {
      await log_error(client, error as Error, "cleanup_live_state_item", {
        platform : platform,
        slug     : state.slug,
        username : state.username,
        live_key : state.live_key,
      })
    }
  }))
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
