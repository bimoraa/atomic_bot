import { Client }         from "discord.js"
import { component, db }  from "../../../shared/utils"
import { log_error }      from "../../../shared/utils/error_logger"
import * as idn_live      from "../../../infrastructure/api/idn_live"
import * as showroom_live from "../../../infrastructure/api/showroom_live"

type live_platform = "idn" | "showroom"

export interface live_history_record {
  platform      : string
  member_name   : string
  title         : string
  url           : string
  image         : string
  viewers       : number
  comments      : number
  comment_users : number
  total_gold    : number
  started_at    : number
  ended_at      : number
  duration_ms   : number
  live_key?     : string
}

export interface live_room_view {
  platform    : string
  member_name : string
  title       : string
  viewers     : number
  started_at  : number
  url         : string
  image       : string
}

/**
 * - NORMALIZE LIVE PLATFORM - \\
 * @param {string} value - Platform value
 * @returns {live_platform} Normalized platform
 */
export function normalize_live_platform(value: string): live_platform {
  const normalized = value.toLowerCase().trim()
  return normalized === "showroom" ? "showroom" : "idn"
}

/**
 * - BUILD HISTORY KEY FOR DEDUPLICATION - \\
 * @param {live_history_record} record - History record
 * @returns {string} Unique key for deduplication
 */
function build_history_key(record: live_history_record): string {
  if (record.live_key) return record.live_key
  return [
    record.platform,
    record.member_name,
    record.started_at,
  ].join(":")
}

/**
 * - FORMAT DURATION - \\
 * @param {number} duration_ms - Duration in milliseconds
 * @returns {string} Human readable duration
 */
function format_duration(duration_ms: number): string {
  const total_seconds = Math.max(0, Math.floor(duration_ms / 1000))
  const hours         = Math.floor(total_seconds / 3600)
  const minutes       = Math.floor((total_seconds % 3600) / 60)
  const seconds       = total_seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

/**
 * - GET HISTORY RECORDS - \\
 * @param {Client} client - Discord client
 * @param {string} platform - Live platform
 * @returns {Promise<live_history_record[]>} History records
 */
export async function get_history_records(client: Client, platform: string): Promise<live_history_record[]> {
  try {
    const normalized = normalize_live_platform(platform)
    const history    = await db.find_many_sorted<live_history_record>(
      "live_history",
      { platform: normalized },
      "ended_at",
      "DESC"
    )

    const history_map = new Map<string, live_history_record>()
    for (const record of history) {
      const key = build_history_key(record)
      const existing = history_map.get(key)
      if (!existing || record.ended_at > existing.ended_at) {
        history_map.set(key, record)
      }
    }

    return Array.from(history_map.values())
  } catch (error) {
    await log_error(client, error as Error, "live_history_get_records", {
      platform : platform,
    })
    return []
  }
}

/**
 * - BUILD HISTORY MESSAGE - \\
 * @param {object} options - Options
 * @param {string} options.platform - Platform
 * @param {live_history_record[]} options.records - History records
 * @param {number} options.index - Record index
 * @param {string} options.requester - Requester name
 * @returns {object} Message payload
 */
export function build_history_message(options: {
  platform  : string
  records   : live_history_record[]
  index     : number
  requester : string
}): object {
  const platform_label = normalize_live_platform(options.platform)
  const records        = options.records || []

  if (records.length === 0) {
    return component.build_message({
      components: [
        component.container({
          accent_color : 0xFEE75C,
          components   : [
            component.text("## Live History ( 0 )"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `No live history available for ${platform_label === "showroom" ? "Showroom" : "IDN"}.`,
              "",
              "Check back after members go live.",
            ]),
          ],
        }),
      ],
    })
  }

  const clamped_index     = Math.min(Math.max(options.index, 0), records.length - 1)
  const record            = records[clamped_index]
  const description       = record.title ? `> ${record.title}` : ""
  const started_timestamp = Math.floor(record.started_at / 1000)
  const ended_timestamp   = Math.floor(record.ended_at / 1000)
  const duration_text     = format_duration(record.duration_ms)
  const comment_text      = `${record.comments.toLocaleString()} of ${record.comment_users.toLocaleString()} Users`

  const header_component = component.container({
    accent_color : null,
    components   : [
      component.text(`## Live History ( ${records.length} )`),
    ],
  })

  const history_component = component.container({
    components: [
      component.section({
        content   : [`### ${record.member_name}`, description].filter(Boolean),
        accessory : component.link_button("Watch", record.url),
      }),
      component.divider(2),
      component.section({
        content: [
          `- **Viewers:** ${record.viewers.toLocaleString()}`,
          `- **Started:** <t:${started_timestamp}:F>`,
          `- **End Live:** <t:${ended_timestamp}:F>`,
          `- **Duration:** ${duration_text}`,
          `- **Comments:** ${comment_text}`,
          `- **Total Gold:** ${record.total_gold.toLocaleString()} G`,
        ],
        accessory : record.image ? component.thumbnail(record.image) : undefined,
      }),
    ],
  })

  const previous_index    = clamped_index - 1
  const next_index        = clamped_index + 1
  const previous_member   = previous_index >= 0 ? records[previous_index]?.member_name : "None"
  const next_member       = next_index < records.length ? records[next_index]?.member_name : "None"
  const previous_disabled = previous_index < 0
  const next_disabled     = next_index >= records.length

  const footer_component = component.container({
    components: [
      component.action_row(
        component.secondary_button(previous_member, `history_live_prev:${platform_label}:${clamped_index}`, undefined, previous_disabled),
        component.secondary_button(next_member, `history_live_next:${platform_label}:${clamped_index}`, undefined, next_disabled)
      ),
      component.divider(2),
      component.text(`Page ${clamped_index + 1}/${records.length} • Last Refreshed: <t:${Math.floor(Date.now() / 1000)}:R> - By **${options.requester}**`),
    ],
  })

  return component.build_message({
    components : [
      header_component,
      history_component,
      footer_component,
    ],
  })
}

/**
 * - GET LIVE ROOMS - \\
 * @param {Client} client - Discord client
 * @param {string} platform - Platform
 * @returns {Promise<live_room_view[]>} Live rooms
 */
export async function get_live_rooms(client: Client, platform: string): Promise<live_room_view[]> {
  try {
    const normalized = normalize_live_platform(platform)
    const all_rooms  = normalized === "showroom"
      ? (await showroom_live.fetch_showroom_live_rooms(client)).map((room) => ({
          platform    : "Showroom",
          member_name : room.member_name,
          title       : room.title,
          viewers     : room.viewers,
          started_at  : room.started_at,
          url         : room.url,
          image       : room.image,
        }))
      : (await idn_live.get_live_rooms(client)).map((room) => ({
          platform    : "IDN",
          member_name : room.member_name,
          title       : room.title,
          viewers     : room.viewers,
          started_at  : room.started_at,
          url         : room.url,
          image       : room.image,
        }))

    const room_map = new Map<string, live_room_view>()
    for (const room of all_rooms) {
      if (!room.url) continue
      const key = [room.platform, room.member_name, room.url].join(":")
      if (!room_map.has(key)) {
        room_map.set(key, room)
      }
    }

    return Array.from(room_map.values())
      .sort((a, b) => b.started_at - a.started_at)
  } catch (error) {
    await log_error(client, error as Error, "live_rooms_get", {
      platform : platform,
    })
    return []
  }
}

/**
 * - BUILD LIVE MESSAGE - \\
 * @param {object} options - Options
 * @param {string} options.platform - Platform
 * @param {live_room_view[]} options.rooms - Live rooms
 * @param {number} options.index - Room index
 * @param {string} options.requester - Requester name
 * @returns {object} Message payload
 */
export function build_live_message(options: {
  platform  : string
  rooms     : live_room_view[]
  index     : number
  requester : string
}): object {
  const platform_label = normalize_live_platform(options.platform)
  const rooms          = options.rooms || []

  if (rooms.length === 0) {
    return component.build_message({
      components: [
        component.container({
          accent_color : 0xFEE75C,
          components   : [
            component.text("## No Members Live"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `No JKT48 members are currently live on ${platform_label === "showroom" ? "Showroom" : "IDN"}.`,
              "",
              "Use `/notify add` to get notified when your favorite member goes live!",
            ]),
          ],
        }),
      ],
    })
  }

  const clamped_index     = Math.min(Math.max(options.index, 0), rooms.length - 1)
  const room              = rooms[clamped_index]
  const started_timestamp = Math.floor(room.started_at / 1000)
  const description       = room.title ? `> ${room.title}` : ""
  const section_text      = [
    `### ${room.member_name} is LIVE on ${room.platform}!`,
    description,
  ].filter(Boolean)

  const header_component = component.container({
    accent_color : 0x2ECC71,
    components   : [
      component.text(`## Currently Live (${rooms.length})`),
    ],
  })

  const live_component = component.container({
    components: [
      component.section({
        content   : section_text,
        accessory : component.link_button("Watch", room.url),
      }),
      component.divider(2),
      component.section({
        content   : [
          `- **Viewers:** ${room.viewers.toLocaleString()}`,
          `- **Started:** <t:${started_timestamp}:R>`,
          `- **Watch URL:** ${room.url}`,
        ],
        accessory : room.image ? component.thumbnail(room.image) : undefined,
      }),
    ],
  })

  const previous_index    = clamped_index - 1
  const next_index        = clamped_index + 1
  const previous_member   = previous_index >= 0 ? rooms[previous_index]?.member_name : "None"
  const next_member       = next_index < rooms.length ? rooms[next_index]?.member_name : "None"
  const previous_disabled = previous_index < 0
  const next_disabled     = next_index >= rooms.length

  const footer_component = component.container({
    components: [
      component.action_row(
        component.secondary_button(previous_member, `check_on_live_prev:${platform_label}:${clamped_index}`, undefined, previous_disabled),
        component.secondary_button(next_member, `check_on_live_next:${platform_label}:${clamped_index}`, undefined, next_disabled)
      ),
      component.divider(2),
      component.text(`Page ${clamped_index + 1}/${rooms.length} • Last Refreshed: <t:${Math.floor(Date.now() / 1000)}:R> - By **${options.requester}**`),
    ],
  })

  return component.build_message({
    components : [
      header_component,
      live_component,
      footer_component,
    ],
  })
}
