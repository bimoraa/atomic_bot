/**
 * - SHOWROOM LIVE API CLIENT - \\
 * JKT48 Showroom API integration
 */

import axios           from "axios"
import { Client }      from "discord.js"
import { log_error }   from "../../shared/utils/error_logger"

const SHOWROOM_API_BASE = process.env.JKT48_SHOWROOM_API_BASE || "https://jkt48showroom-api.vercel.app/api"

export interface showroom_member {
  room_id : number
  name    : string
  image?  : string
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
 * - FETCH SHOWROOM MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_member[]>} Member list
 */
export async function fetch_showroom_members(client: Client): Promise<showroom_member[]> {
  try {
    const response = await axios.get(`${SHOWROOM_API_BASE}/member`, {
      timeout : 15000,
      headers : {
        "User-Agent" : "JKT48-Discord-Bot/2.0",
        "Accept"     : "application/json",
      },
    })

    const data = response.data?.data || response.data || []
    if (!Array.isArray(data)) return []

    return data.map((member: any) => {
      const room_id = Number(member.room_id || member.roomId || member.showroom_id || member.id || 0)
      return {
        room_id : room_id,
        name    : member.name || member.member_name || member.nickname || "Unknown",
        image   : member.image || member.img || member.profile_image || "",
      } as showroom_member
    }).filter((member: showroom_member) => member.room_id)
  } catch (error) {
    await log_error(client, error as Error, "showroom_fetch_members", {})
    return []
  }
}

/**
 * - FETCH SHOWROOM LIVE ROOMS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<showroom_live_room[]>} Live room list
 */
export async function fetch_showroom_live_rooms(client: Client): Promise<showroom_live_room[]> {
  try {
    const response = await axios.get(`${SHOWROOM_API_BASE}/now_live`, {
      timeout : 15000,
      params  : { group: "jkt48" },
      headers : {
        "User-Agent" : "JKT48-Discord-Bot/2.0",
        "Accept"     : "application/json",
      },
    })

    const data = response.data?.data || response.data || []
    if (!Array.isArray(data)) return []

    return data.map((room: any) => {
      const room_id    = Number(room.room_id || room.roomId || room.id || 0)
      const started_at = normalize_showroom_timestamp(room.live_at || room.started_at || room.start_time || Date.now())
      const member_name = room.name || room.member_name || room.nickname || "Unknown"
      const image = room.image || room.img || room.profile_image || ""
      const url   = room.url || room.stream_url || room.showroom_url || (room_id ? `https://www.showroom-live.com/r/${room_id}` : "")
      return {
        room_id     : room_id,
        member_name : member_name,
        title       : room.title || room.room_title || "Showroom Live",
        started_at  : started_at,
        viewers     : Number(room.viewers || room.view_count || room.viewer || 0),
        image       : image,
        url         : url,
      } as showroom_live_room
    }).filter((room: showroom_live_room) => room.room_id)
  } catch (error) {
    await log_error(client, error as Error, "showroom_fetch_live_rooms", {})
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
  const normalized_search = name.toLowerCase().trim()

  const found_member = members.find((member) => {
    const member_name = member.name.toLowerCase()
    return member_name.includes(normalized_search)
      || normalized_search.includes(member_name)
  })

  return found_member || null
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
