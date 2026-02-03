/**
 * - IDN LIVE API CLIENT - \\
 * Direct IDN Live API integration for JKT48
 */

import axios from "axios"

const IDN_API_BASE  = "https://idn-api-live-jkt48.vercel.app/api"
const IDN_LIVE_BASE = "https://www.idn.app"

export interface idn_user {
  name     : string
  username : string
  avatar?  : string
}

export interface idn_livestream {
  slug        : string
  title       : string
  image       : string
  stream_url  : string
  view_count  : number
  live_at     : string
  user        : idn_user
  status?     : string
}

export interface jkt48_member {
  slug           : string
  name           : string
  username       : string
  url            : string
  image          : string
  is_live        : boolean
  live_started_at?: number
  live_url?      : string
  viewers?       : number
  title?         : string
}

export interface live_room {
  slug        : string
  member_name : string
  username    : string
  title       : string
  started_at  : number
  viewers     : number
  image       : string
  url         : string
}

/**
 * - FETCH IDN LIVE DATA - \\
 * @returns {Promise<idn_livestream[]>} IDN Live data
 */
async function fetch_idn_live_data(): Promise<idn_livestream[]> {
  try {
    const response = await axios.get(`${IDN_API_BASE}/jkt48`, {
      timeout : 15000,
      headers : {
        "User-Agent" : "JKT48-Discord-Bot/2.0",
        "Accept"     : "application/json",
      },
    })

    if (!response.data) {
      return []
    }

    const data = Array.isArray(response.data) ? response.data : (response.data.data || [])

    return data.filter((stream: any) => stream && stream.slug && stream.user)
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error fetching IDN data:", error)
    return []
  }
}

/**
 * - GET ALL JKT48 MEMBERS - \\
 * @returns {Promise<jkt48_member[]>} List of all JKT48 members from IDN Live
 */
export async function get_all_members(): Promise<jkt48_member[]> {
  try {
    const live_streams = await fetch_idn_live_data()

    const unique_members = new Map<string, jkt48_member>()

    for (const stream of live_streams) {
      const username = stream.user.username.toLowerCase()
      
      if (!unique_members.has(username)) {
        unique_members.set(username, {
          slug     : stream.slug,
          name     : stream.user.name,
          username : stream.user.username,
          url      : `${IDN_LIVE_BASE}/${stream.user.username}`,
          image    : stream.user.avatar || stream.image,
          is_live  : false,
        })
      }
    }

    return Array.from(unique_members.values())
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error fetching members:", error)
    return []
  }
}

/**
 * - GET LIVE ROOMS - \\
 * @returns {Promise<live_room[]>} List of currently live IDN streams
 */
export async function get_live_rooms(): Promise<live_room[]> {
  try {
    const live_streams = await fetch_idn_live_data()

    if (!live_streams || live_streams.length === 0) {
      return []
    }

    return live_streams.map((stream) => {
      const started_at_date = new Date(stream.live_at)
      const started_at      = started_at_date.getTime()

      return {
        slug        : stream.slug,
        member_name : stream.user.name,
        username    : stream.user.username,
        title       : stream.title,
        started_at  : isNaN(started_at) ? Date.now() : started_at,
        viewers     : stream.view_count || 0,
        image       : stream.image || stream.user.avatar || "",
        url         : stream.stream_url || `${IDN_LIVE_BASE}/${stream.user.username}/live/${stream.slug}`,
      }
    })
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error fetching live rooms:", error)
    return []
  }
}

/**
 * - GET MEMBER BY NAME - \\
 * @param {string} name - Member name or username to search
 * @returns {Promise<jkt48_member | null>} Member data or null
 */
export async function get_member_by_name(name: string): Promise<jkt48_member | null> {
  try {
    const live_streams = await fetch_idn_live_data()
    const normalized_search = name.toLowerCase().trim()

    const found_stream = live_streams.find((stream) => {
      const member_name = stream.user.name.toLowerCase()
      const username    = stream.user.username.toLowerCase()
      
      return member_name.includes(normalized_search) || 
             username.includes(normalized_search) ||
             normalized_search.includes(member_name) ||
             normalized_search.includes(username)
    })

    if (!found_stream) {
      return null
    }

    return {
      slug     : found_stream.slug,
      name     : found_stream.user.name,
      username : found_stream.user.username,
      url      : `${IDN_LIVE_BASE}/${found_stream.user.username}`,
      image    : found_stream.user.avatar || found_stream.image,
      is_live  : false,
    }
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error finding member:", error)
    return null
  }
}

/**
 * - CHECK IF MEMBER IS LIVE - \\
 * @param {string} slug - Stream slug to check
 * @returns {Promise<live_room | null>} Live room data or null
 */
export async function check_member_live(slug: string): Promise<live_room | null> {
  try {
    const live_rooms = await get_live_rooms()
    return live_rooms.find((room) => room.slug === slug || room.username.toLowerCase() === slug.toLowerCase()) || null
  } catch (error) {
    console.error("[ - IDN LIVE - ] Error checking member live:", error)
    return null
  }
}

/**
 * - FORMAT LIVE ROOM COMPONENT - \\
 * @param {live_room} room - Live room data
 * @returns {object} Component container for live room
 */
export function format_live_component(room: live_room) {
  const started_timestamp = Math.floor(room.started_at / 1000)

  return {
    type         : 17,
    accent_color : 0xFF69B4,
    components   : [
      {
        type       : 9,
        components : [
          {
            type    : 10,
            content : `## ${room.member_name} is LIVE on IDN!`,
          },
        ],
        accessory : {
          type  : 11,
          media : {
            url : room.image,
          },
        },
      },
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
          `**Viewers:** ${room.viewers.toLocaleString()} 👥`,
          `**Started:** <t:${started_timestamp}:R>`,
          `**Channel:** @${room.username}`,
        ].join("\n"),
      },
    ],
  }
}
