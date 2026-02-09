/**
 * - SHOWROOM LIVE API CLIENT - \\
 * JKT48 Showroom API integration
 */

import axios           from "axios"
import { Client }      from "discord.js"
import * as file       from "@shared/utils/file"
import { log_error }   from "@shared/utils/error_logger"

const SHOWROOM_CFG_PATH = process.env.JKT48_SHOWROOM_CFG_PATH || file.resolve("assets", "jkt48", "jkt48_showroom.cfg")
const SHOWROOM_WEB_BASE = "https://www.showroom-live.com"

let showroom_sr_id = ""

export interface showroom_member {
  room_id : number
  name    : string
  image?  : string
}

export interface showroom_cfg_account {
  room_id   : number
  room_key  : string
  room_name : string
}

export interface showroom_cfg_payload {
  officials? : Record<string, showroom_cfg_account>
  members?   : Record<string, showroom_cfg_account>
}

export interface showroom_live_room {
  room_id     : number
  member_name : string
  title       : string
  started_at  : number
  viewers     : number
  image       : string
  url         : string
}

export interface showroom_history_metrics {
  comments?      : number
  comment_users? : number
  total_gold?    : number
  viewers?       : number
  started_at?    : number
  ended_at?      : number
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
 * - ENSURE SHOWROOM SESSION - \\
 * @returns {Promise<void>} Void
 */
async function ensure_showroom_session(): Promise<void> {
  if (!showroom_sr_id) {
    await refresh_showroom_session()
  }
}

/**
 * - SHOWROOM GET WITH SESSION RETRY - \\
 * @param {string} path - API path
 * @param {object} params - Query params
 * @returns {Promise<any>} Response data
 */
async function showroom_get_with_session(path: string, params: Record<string, any> = {}): Promise<any> {
  try {
    await ensure_showroom_session()
    return await showroom_get(path, params)
  } catch (error) {
    await refresh_showroom_session().catch(() => {})
    return await showroom_get(path, params)
  }
}

/**
 * - EXTRACT SHOWROOM SR ID - \\
 * @param {string[] | string | undefined} set_cookie - Set-Cookie header value
 * @returns {string} sr_id cookie value
 */
function extract_showroom_sr_id(set_cookie: string[] | string | undefined): string {
  if (!set_cookie) return ""

  const cookies = Array.isArray(set_cookie) ? set_cookie : [set_cookie]
  for (const cookie of cookies) {
    const match = cookie.match(/(?:^|;\s*)sr_id=([^;]+)/i)
    if (match?.[1]) return match[1]
  }

  return ""
}

/**
 * - GET SHOWROOM DEFAULT HEADERS - \\
 * @returns {Record<string, string>} Headers
 */
function get_showroom_headers(): Record<string, string> {
  return {
    "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Referer"    : "https://www.showroom-live.com/",
    "Accept"     : "application/json",
    "Cookie"     : showroom_sr_id ? `sr_id=${showroom_sr_id};` : "",
  }
}

/**
 * - REFRESH SHOWROOM SESSION - \\
 * @returns {Promise<void>} Void
 */
async function refresh_showroom_session(): Promise<void> {
  const response = await axios.get(`${SHOWROOM_WEB_BASE}/`, {
    timeout : 15000,
    headers : {
      "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Referer"    : "https://www.showroom-live.com/",
      "Accept"     : "text/html",
    },
  })

  showroom_sr_id = extract_showroom_sr_id(response.headers?.["set-cookie"])
}

/**
 * - SHOWROOM GET REQUEST - \\
 * @param {string} path - API path
 * @param {object} params - Query params
 * @returns {Promise<any>} Response data
 */
async function showroom_get(path: string, params: Record<string, any> = {}): Promise<any> {
  const url = `${SHOWROOM_WEB_BASE}${path}`
  const response = await axios.get(url, {
    timeout : 15000,
    params  : params,
    headers : get_showroom_headers(),
  })

  return response.data
}

//
/**
 * - NORMALIZE SHOWROOM TIMESTAMP - \\
 * @param {number | string} live_at - Live timestamp value
 * @returns {number} Unix timestamp in milliseconds
 */
function normalize_showroom_timestamp(live_at: number | string): number {
  const numeric = typeof live_at === "string" ? Number(live_at) : live_at
  const base_ms = Number.isFinite(numeric) ? numeric : Date.now()
  return base_ms < 1_000_000_000_000 ? base_ms * 1000 : base_ms
}

/**
 * - NORMALIZE SHOWROOM SEARCH - \\
 * @param {string} input - Raw input
 * @returns {string} Normalized search text
 */
function normalize_showroom_search(input: string): string {
  const cleaned = input.toLowerCase().trim().replace(/^@/, "")
  const without_prefix = cleaned.replace(/jkt48/g, "")
  return without_prefix
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * - LOAD SHOWROOM CFG MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_member[]>} Member list
 */
async function load_showroom_cfg_members(client: Client): Promise<showroom_member[]> {
  try {
    if (!file.exists(SHOWROOM_CFG_PATH)) {
      return []
    }

    const payload = file.read_json<showroom_cfg_payload>(SHOWROOM_CFG_PATH)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const members: showroom_member[] = []

    for (const record of records) {
      for (const account of Object.values(record)) {
        const room_id = Number(account?.room_id || 0)
        if (!room_id) continue

        members.push({
          room_id : room_id,
          name    : account.room_name || "Unknown",
          image   : "",
        })
      }
    }

    return members
  } catch (error) {
    await log_error(client, error as Error, "showroom_load_cfg_members", {
      path : SHOWROOM_CFG_PATH,
    })
    return []
  }
}

/**
 * - FETCH SHOWROOM MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_member[]>} Member list
 */
export async function fetch_showroom_members(client: Client): Promise<showroom_member[]> {
  try {
    return await load_showroom_cfg_members(client)
  } catch (error) {
    await log_error(client, error as Error, "showroom_fetch_members", {
      path : SHOWROOM_CFG_PATH,
    })
    return await load_showroom_cfg_members(client)
  }
}

/**
 * - FETCH SHOWROOM LIVE ROOMS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_live_room[]>} Live room list
 */
export async function fetch_showroom_live_rooms(client: Client): Promise<showroom_live_room[]> {
  try {
    const members = await load_showroom_cfg_members(client)
    const member_room_ids = new Set<number>(members.map((member) => member.room_id))
    const member_name_map = new Map<number, string>(members.map((member) => [member.room_id, member.name]))

    let onlives_response = await showroom_get("/api/live/onlives")
    if (!showroom_sr_id) {
      await refresh_showroom_session()
      onlives_response = await showroom_get("/api/live/onlives")
    }

    const onlives = onlives_response?.onlives || []
    const live_rooms = Array.isArray(onlives)
      ? onlives.flatMap((genre: any) => Array.isArray(genre?.lives) ? genre.lives : [])
      : []

    return live_rooms.map((room: any) => {
      const room_id     = Number(room.room_id || 0)
      const started_at  = normalize_showroom_timestamp(room.started_at || Date.now())
      const member_name = member_name_map.get(room_id) || room.main_name || room.room_name || "Unknown"
      const room_key    = room.room_url_key || ""
      const image       = room.image || ""
      const url         = room_key ? `https://www.showroom-live.com/r/${room_key}` : ""
      const title       = room.telop || "Showroom Live"

      return {
        room_id     : room_id,
        member_name : member_name,
        title       : title,
        started_at  : started_at,
        viewers     : Number(room.view_num || 0),
        image       : image,
        url         : url,
      } as showroom_live_room
    }).filter((room: showroom_live_room) => room.room_id && member_room_ids.has(room.room_id))
  } catch (error) {
    await log_error(client, error as Error, "showroom_fetch_live_rooms", {
      endpoint : "https://www.showroom-live.com/api/live/onlives",
    })
    return []
  }
}

/**
 * - GET SHOWROOM MEMBER BY NAME - \\
 * @param {string} name - Member name
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_member | null>} Member data or null
 */
export async function get_showroom_member_by_name(name: string, client: Client): Promise<showroom_member | null> {
  const members = await fetch_showroom_members(client)
  const normalized_search = normalize_showroom_search(name)

  const found_member = members.find((member) => {
    const member_name = member.name.toLowerCase()
    const normalized_member = normalize_showroom_search(member.name)
    return member_name.includes(normalized_search)
      || normalized_search.includes(member_name)
      || normalized_member.includes(normalized_search)
      || normalized_search.includes(normalized_member)
  })

  return found_member || null
}

/**
 * - FETCH SHOWROOM HISTORY METRICS - \\
 * @param {Client} client - Discord client
 * @param {number} room_id - Showroom room ID
 * @returns {Promise<showroom_history_metrics>} Metrics
 */
export async function fetch_showroom_history_metrics(client: Client, room_id: number): Promise<showroom_history_metrics> {
  if (!room_id) return {}

  try {
    const live_data = await showroom_get_with_session("/room/get_live_data", { room_id: room_id })
    const live_res = live_data?.live_res || live_data?.live || live_data?.live_data || {}

    const comments_value = pick_number([
      live_res?.comment_num,
      live_res?.comment_count,
      live_data?.comment_num,
      live_data?.comment_count,
    ])

    const comment_users_value = pick_number([
      live_res?.comment_users,
      live_res?.comment_user,
      live_res?.unique_commenters,
      live_data?.comment_users,
      live_data?.unique_commenters,
    ])

    const viewers_value = pick_number([
      live_res?.view_uu,
      live_res?.viewer_count,
      live_res?.view_num,
      live_data?.view_num,
      live_data?.viewers,
    ])

    const started_at_raw = pick_number([
      live_res?.started_at,
      live_res?.live_started_at,
      live_data?.started_at,
    ])

    const ended_at_raw = pick_number([
      live_res?.ended_at,
      live_res?.end_at,
      live_data?.ended_at,
      live_data?.end_at,
    ])

    let total_gold_value = pick_number([
      live_res?.total_point,
      live_res?.total_points,
      live_res?.total_gifts,
      live_res?.total_gold,
      live_data?.total_point,
      live_data?.total_points,
      live_data?.total_gifts,
    ])

    if (total_gold_value === undefined) {
      const summary = await showroom_get_with_session("/api/live/summary_ranking", { room_id: room_id })
      const rankings = Array.isArray(summary?.ranking) ? summary.ranking : []

      if (rankings.length > 0) {
        total_gold_value = rankings.reduce((total: number, entry: any) => {
          const points = pick_number([
            entry?.point,
            entry?.points,
            entry?.total_point,
            entry?.total_points,
          ]) || 0
          return total + points
        }, 0)
      }
    }

    if (total_gold_value === undefined) {
      const gifts = await showroom_get_with_session("/api/live/gift_log", { room_id: room_id })
      const gift_log = Array.isArray(gifts?.gift_log) ? gifts.gift_log : []

      if (gift_log.length > 0) {
        total_gold_value = gift_log.reduce((total: number, entry: any) => {
          const unit_value = pick_number([
            entry?.point,
            entry?.gift_point,
            entry?.price,
            entry?.value,
            entry?.total_point,
            entry?.total_points,
          ]) || 0
          const count = pick_number([
            entry?.gift_num,
            entry?.num,
            entry?.count,
          ]) || 1
          return total + (unit_value * count)
        }, 0)
      }
    }

    let comments_total = comments_value
    let comment_users_total = comment_users_value

    if (comments_total === undefined || comment_users_total === undefined) {
      const comment_log = await showroom_get_with_session("/api/live/comment_log", { room_id: room_id })
      const entries = Array.isArray(comment_log?.comment_log) ? comment_log.comment_log : []

      if (comments_total === undefined) {
        comments_total = entries.length
      }

      if (comment_users_total === undefined) {
        const unique_users = new Set<string>()
        for (const entry of entries) {
          const user_id = entry?.user_id || entry?.user?.user_id || entry?.user?.id
          if (user_id !== undefined && user_id !== null) {
            unique_users.add(String(user_id))
          }
        }
        comment_users_total = unique_users.size
      }
    }

    const started_at = started_at_raw ? normalize_showroom_timestamp(started_at_raw) : undefined
    const ended_at = ended_at_raw ? normalize_showroom_timestamp(ended_at_raw) : undefined

    return {
      comments      : comments_total,
      comment_users : comment_users_total,
      total_gold    : total_gold_value,
      viewers       : viewers_value,
      started_at    : started_at,
      ended_at      : ended_at,
    }
  } catch (error) {
    await log_error(client, error as Error, "showroom_fetch_history_metrics", {
      room_id : room_id,
    })
    return {}
  }
}

/**
 * - FORMAT SHOWROOM LIVE COMPONENT - \\
 * @param {showroom_live_room} room - Live room data
 * @returns {object} Component container
 */
export function format_showroom_live_component(room: showroom_live_room) {
  const started_timestamp = Math.floor(room.started_at / 1000)
  const has_image          = Boolean(room.image)
  const header_section : any = {
    type       : 9,
    components : [
      {
        type    : 10,
        content : `## ${room.member_name} is LIVE on Showroom!`,
      },
    ],
  }

  if (has_image) {
    header_section.accessory = {
      type  : 11,
      media : {
        url : room.image,
      },
    }
  }

  return {
    type         : 17,
    accent_color : 0xE91E63,
    components   : [
      header_section,
      {
        type    : 10,
        content : `**${room.title}**`,
      },
      {
        type    : 14,
        spacing : 2,
      },
      {
        type    : 10,
        content : [
          `**Viewers:** ${room.viewers.toLocaleString()}`,
          `**Started:** <t:${started_timestamp}:R>`,
          `**Room ID:** ${room.room_id}`,
        ].join("\n"),
      },
    ],
  }
}
