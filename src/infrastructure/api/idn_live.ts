/**
 * - IDN LIVE API CLIENT - \\
 * Direct IDN Live API integration for JKT48
 */

import axios           from "axios"
import { Client }      from "discord.js"
import * as db         from "../../shared/utils/database"
import * as file       from "../../shared/utils/file"
import { log_error }   from "../../shared/utils/error_logger"

const IDN_LIVE_BASE         = "https://www.idn.app"
const IDN_MOBILE_API        = "https://mobile-api.idntimes.com/v3/livestreams"
const IDN_DETAIL_API        = "https://api.idn.app/api/v4/livestream"
const IDN_GRAPHQL_API       = "https://api.idn.app/graphql"
const IDN_ROSTER_API_BASE   = process.env.JKT48_SHOWROOM_API_BASE || "https://jkt48showroom-api.vercel.app"
const IDN_CFG_PATH          = process.env.JKT48_IDN_CFG_PATH || file.resolve("assets", "jkt48", "jkt48_idn.cfg")
const IDN_ROSTER_COLLECTION = "idn_roster_cache"
const IDN_ROSTER_CACHE_KEY  = "default"
const IDN_MOBILE_KEY        = "1ccc5bc4-8bb4-414c-b524-92d11a85a818"
const IDN_DETAIL_KEY        = "123f4c4e-6ce1-404d-8786-d17e46d65b5c"
const IDN_USER_AGENT        = "IDN/6.41.1 (com.idntimes.IDNTimes; build:745; iOS 17.2.1) Alamofire/5.1.0"
const IDN_DETAIL_AGENT      = "Android/14/SM-A528B/6.47.4"
const IDN_ROSTER_TTL_MS     = 1000 * 60 * 60 * 6

const detail_cache      = new Map<string, string>()
const roster_cache      = {
  data       : [] as jkt48_member[],
  fetched_at : 0,
}

export interface idn_user {
  name     : string
  username : string
  avatar?  : string
}

export interface idn_public_profile extends idn_user {
  uuid? : string
}

export interface idn_cfg_account {
  username            : string
  uuid                : string
  name                : string
  default_stream_url? : string | null
}

export interface idn_cfg_payload {
  officials? : Record<string, idn_cfg_account>
  members?   : Record<string, idn_cfg_account>
}

export interface idn_roster_cache {
  key        : string
  members    : jkt48_member[]
  updated_at : number
  source?    : string
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
 * - NORMALIZE IDN LIVE TIMESTAMP - \\
 * @param {number | string} live_at - Live timestamp value
 * @returns {string} ISO date string
 */
function normalize_live_timestamp(live_at: number | string): string {
  const numeric = typeof live_at === "string" ? Number(live_at) : live_at
  const base_ms = Number.isFinite(numeric) ? numeric : Date.now()
  const ms      = base_ms < 1_000_000_000_000 ? base_ms * 1000 : base_ms
  return new Date(ms).toISOString()
}

/**
 * - LOAD IDN ROSTER CACHE - \\
 * @param {Client} client - Discord client
 * @returns {Promise<idn_roster_cache | null>} Cached roster
 */
async function load_idn_roster_cache(client: Client): Promise<idn_roster_cache | null> {
  if (!db.is_connected()) {
    return null
  }

  try {
    return await db.find_one<idn_roster_cache>(IDN_ROSTER_COLLECTION, {
      key : IDN_ROSTER_CACHE_KEY,
    })
  } catch (error) {
    await log_error(client, error as Error, "idn_live_load_roster_cache", {})
    return null
  }
}

/**
 * - SAVE IDN ROSTER CACHE - \\
 * @param {Client} client - Discord client
 * @param {jkt48_member[]} members - Member list
 * @param {string} source - Data source
 * @returns {Promise<void>}
 */
async function save_idn_roster_cache(client: Client, members: jkt48_member[], source: string): Promise<void> {
  if (!db.is_connected() || members.length === 0) {
    return
  }

  try {
    await db.update_one<idn_roster_cache>(
      IDN_ROSTER_COLLECTION,
      { key: IDN_ROSTER_CACHE_KEY },
      {
        key        : IDN_ROSTER_CACHE_KEY,
        members    : members,
        updated_at : Date.now(),
        source     : source,
      },
      true
    )
  } catch (error) {
    await log_error(client, error as Error, "idn_live_save_roster_cache", {
      source : source,
    })
  }
}

/**
 * - FETCH IDN UUID LIST - \\
 * @param {Client} client - Discord client
 * @returns {Promise<string[]>} UUID list
 */
async function fetch_idn_uuid_list(client: Client): Promise<string[]> {
  try {
    if (!file.exists(IDN_CFG_PATH)) {
      return []
    }

    const payload = file.read_json<idn_cfg_payload>(IDN_CFG_PATH)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const uuids = new Set<string>()

    for (const record of records) {
      for (const account of Object.values(record)) {
        if (account?.uuid) {
          uuids.add(account.uuid)
        }
      }
    }

    return Array.from(uuids)
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_uuid_list", {
      path : IDN_CFG_PATH,
    })
    return []
  }
}

/**
 * - BUILD ROSTER ENDPOINTS - \\
 * @param {string} base - Roster API base
 * @returns {string[]} Endpoint list
 */
function build_roster_endpoints(base: string): string[] {
  const normalized = base.replace(/\/+$/, "")
  const endpoints  = new Set<string>()

  endpoints.add(`${normalized}/api/member`)
  endpoints.add(`${normalized}/member`)

  if (normalized.endsWith("/api")) {
    const without_api = normalized.replace(/\/api$/, "")
    if (without_api && without_api !== normalized) {
      endpoints.add(`${without_api}/api/member`)
      endpoints.add(`${without_api}/member`)
    }
  }

  return Array.from(endpoints)
}

/**
 * - MATCH MEMBER SEARCH - \\
 * @param {jkt48_member[]} members - Member list
 * @param {string} search - Search keyword
 * @returns {jkt48_member | null} Matched member
 */
function match_member_search(members: jkt48_member[], search: string): jkt48_member | null {
  const normalized_search = search.toLowerCase().trim()

  return members.find((member) => {
    const member_name = member.name.toLowerCase()
    const username    = member.username.toLowerCase()

    return member_name.includes(normalized_search)
      || username.includes(normalized_search)
      || normalized_search.includes(member_name)
      || normalized_search.includes(username)
  }) || null
}

/**
 * - BUILD USERNAME CANDIDATES - \\
 * @param {string} input - Raw user input
 * @returns {string[]} Candidate usernames
 */
function build_username_candidates(input: string): string[] {
  const normalized  = input.toLowerCase().trim().replace(/^@/, "")
  const compact     = normalized.replace(/\s+/g, "")
  const cleaned     = compact.replace(/[^a-z0-9_.]/g, "")
  const without_jkt = cleaned.replace(/jkt48/g, "")
  const candidates  = new Set<string>()

  if (cleaned) {
    candidates.add(cleaned)
  }

  if (without_jkt && without_jkt !== cleaned) {
    candidates.add(`jkt48_${without_jkt}`)
  }

  if (!cleaned.startsWith("jkt48") && cleaned) {
    candidates.add(`jkt48_${cleaned}`)
    candidates.add(`jkt48${cleaned}`)
  }

  if (cleaned.startsWith("jkt48") && !cleaned.startsWith("jkt48_")) {
    const suffix = cleaned.replace(/^jkt48/, "")
    if (suffix) {
      candidates.add(`jkt48_${suffix}`)
    }
  }

  return Array.from(candidates).filter(Boolean)
}

/**
 * - CHECK JKT48 PROFILE - \\
 * @param {idn_public_profile} profile - Public profile
 * @returns {boolean} True when profile is JKT48
 */
function is_jkt48_profile(profile: idn_public_profile): boolean {
  const name     = profile.name.toLowerCase()
  const username = profile.username.toLowerCase()
  return name.includes("jkt48") || username.includes("jkt48")
}

/**
 * - LOAD IDN CFG MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<jkt48_member[]>} Member list
 */
async function load_idn_cfg_members(client: Client): Promise<jkt48_member[]> {
  try {
    if (!file.exists(IDN_CFG_PATH)) {
      return []
    }

    const payload = file.read_json<idn_cfg_payload>(IDN_CFG_PATH)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const members: jkt48_member[] = []

    for (const record of records) {
      for (const account of Object.values(record)) {
        if (!account?.username || !account?.name) continue

        members.push({
          slug      : account.username,
          name      : account.name,
          username  : account.username,
          url       : `${IDN_LIVE_BASE}/${account.username}`,
          image     : "",
          is_live   : false,
        })
      }
    }

    return members
  } catch (error) {
    await log_error(client, error as Error, "idn_live_load_cfg_members", {
      path : IDN_CFG_PATH,
    })
    return []
  }
}

/**
 * - FETCH ALL IDN LIVES - \\
 * @param {Client} client - Discord client
 * @returns {Promise<any[]>} Raw IDN live list
 */
async function fetch_all_idn_lives(client: Client): Promise<any[]> {
  const results: any[] = []
  let page             = 1

  while (page <= 50) {
    try {
      const response = await axios.get(IDN_MOBILE_API, {
        timeout : 15000,
        params  : {
          category : "all",
          page     : page,
          _        : Date.now(),
        },
        headers : {
          Host              : "mobile-api.idntimes.com",
          "x-api-key"       : IDN_MOBILE_KEY,
          "User-Agent"      : IDN_USER_AGENT,
          "Connection"      : "keep-alive",
          "Accept-Language" : "en-ID;q=1.0, id-ID;q=0.9",
          "Accept"          : "*/*",
        },
      })

      const data = response.data?.data
      if (!Array.isArray(data) || data.length === 0) {
        break
      }

      results.push(...data)
      page += 1
    } catch (error) {
      await log_error(client, error as Error, "idn_live_fetch_mobile_api", { page })
      break
    }
  }

  return results
}

/**
 * - FETCH IDN LIVE DETAIL - \\
 * @param {string} slug - Live slug
 * @param {Client} client - Discord client
 * @returns {Promise<string | null>} Playback URL or null
 */
async function fetch_live_detail(slug: string, client: Client): Promise<string | null> {
  if (detail_cache.has(slug)) {
    return detail_cache.get(slug) || null
  }

  try {
    const response = await axios.get(`${IDN_DETAIL_API}/${slug}`, {
      timeout : 15000,
      headers : {
        "User-Agent" : IDN_DETAIL_AGENT,
        "x-api-key"  : IDN_DETAIL_KEY,
      },
    })

    const stream_url = response.data?.data?.playback_url || null
    if (stream_url) {
      detail_cache.set(slug, stream_url)
    }
    return stream_url
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_detail_api", { slug })
    return null
  }
}

/**
 * - FETCH PUBLIC PROFILE - \\
 * @param {string} username - IDN username
 * @param {Client} client - Discord client
 * @returns {Promise<idn_public_profile | null>} Public profile data or null
 */
async function fetch_public_profile_by_username(username: string, client: Client): Promise<idn_public_profile | null> {
  try {
    const response = await axios.post(IDN_GRAPHQL_API, {
      query     : "query GetProfileByUsername($username: String!) { getPublicProfileByUsername(username: $username) { name username uuid avatar } }",
      variables : { username },
    }, {
      timeout : 15000,
      headers : {
        "User-Agent"   : IDN_USER_AGENT,
        "Content-Type" : "application/json",
      },
    })

    const profile = response.data?.data?.getPublicProfileByUsername
    if (!profile?.username) {
      return null
    }

    return {
      name     : profile.name || "Unknown",
      username : profile.username,
      avatar   : profile.avatar || "",
      uuid     : profile.uuid,
    }
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_public_profile", {
      username : username,
    })
    return null
  }
}

/**
 * - FETCH PUBLIC PROFILE BY UUID - \\
 * @param {string} uuid - IDN user UUID
 * @param {Client} client - Discord client
 * @returns {Promise<idn_public_profile | null>} Public profile data or null
 */
async function fetch_public_profile_by_uuid(uuid: string, client: Client): Promise<idn_public_profile | null> {
  try {
    const response = await axios.post(IDN_GRAPHQL_API, {
      query     : "query GetPublicProfile($uuid: String!) { getPublicProfile(uuid: $uuid) { name username uuid avatar } }",
      variables : { uuid },
    }, {
      timeout : 15000,
      headers : {
        "User-Agent"   : IDN_USER_AGENT,
        "Content-Type" : "application/json",
      },
    })

    const profile = response.data?.data?.getPublicProfile
    if (!profile?.username) {
      return null
    }

    return {
      name     : profile.name || "Unknown",
      username : profile.username,
      avatar   : profile.avatar || "",
      uuid     : profile.uuid,
    }
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_public_profile_uuid", {
      uuid : uuid,
    })
    return null
  }
}

/**
 * - FETCH IDN ROSTER BY UUID - \\
 * @param {Client} client - Discord client
 * @returns {Promise<jkt48_member[]>} Roster list
 */
async function fetch_idn_roster_by_uuid(client: Client): Promise<jkt48_member[]> {
  const uuid_list = await fetch_idn_uuid_list(client)
  if (uuid_list.length === 0) {
    return []
  }

  const batch_size = 6
  const members: jkt48_member[] = []

  for (let index = 0; index < uuid_list.length; index += batch_size) {
    const batch = uuid_list.slice(index, index + batch_size)
    const results = await Promise.all(
      batch.map((uuid) => fetch_public_profile_by_uuid(uuid, client))
    )

    for (const profile of results) {
      if (!profile?.username) continue
      members.push({
        slug     : "",
        name     : profile.name,
        username : profile.username,
        url      : `${IDN_LIVE_BASE}/${profile.username}`,
        image    : profile.avatar || "",
        is_live  : false,
      })
    }
  }

  return members
}

/**
 * - FETCH IDN ROSTER - \\
 * @param {Client} client - Discord client
 * @returns {Promise<jkt48_member[]>} Roster list
 */
async function fetch_idn_roster(client: Client): Promise<jkt48_member[]> {
  try {
    const endpoints = build_roster_endpoints(IDN_ROSTER_API_BASE)
    const errors: Array<{ endpoint: string; status?: number; message?: string }> = []

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          timeout : 15000,
          params  : { group: "jkt48" },
          headers : {
            "User-Agent" : "JKT48-Discord-Bot/2.0",
            "Accept"     : "application/json",
          },
        })

        const data = response.data?.data || response.data?.members || response.data || []
        if (!Array.isArray(data)) {
          continue
        }

        const members = data.map((member: any) => {
          const username = member.idn_username
            || member.idn?.username
            || member.username
            || member.user?.username
            || member.idn
            || ""
          const name = member.name
            || member.member_name
            || member.nickname
            || member.user?.name
            || "Unknown"
          const image = member.avatar
            || member.image
            || member.img
            || member.profile_image
            || member.user?.avatar
            || ""

          return {
            slug     : "",
            name     : name,
            username : username,
            url      : username ? `${IDN_LIVE_BASE}/${username}` : "",
            image    : image,
            is_live  : false,
          } as jkt48_member
        }).filter((member: jkt48_member) => member.username)

        if (members.length > 0) {
          return members
        }
      } catch (error) {
        const status  = (error as any)?.response?.status
        const message = (error as any)?.response?.data?.message || (error as Error).message
        errors.push({ endpoint, status, message })
      }
    }

    if (errors.length > 0) {
      await log_error(client, new Error("Failed to fetch IDN roster"), "idn_live_fetch_roster", {
        base_url  : IDN_ROSTER_API_BASE,
        endpoints : endpoints,
        errors    : errors,
      })
    }

    const cfg_members  = await load_idn_cfg_members(client)
    const uuid_members = await fetch_idn_roster_by_uuid(client)
    const combined: jkt48_member[] = []

    for (const member of cfg_members) {
      combined.push(member)
    }

    for (const member of uuid_members) {
      if (!combined.some((entry) => entry.username === member.username)) {
        combined.push(member)
      }
    }

    return combined
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_roster", {
      base_url : IDN_ROSTER_API_BASE,
    })
    return []
  }
}

/**
 * - FETCH IDN LIVE DATA - \\
 * @param {Client} client - Discord client
 * @returns {Promise<idn_livestream[]>} IDN Live data
 */
async function fetch_idn_live_data(client: Client): Promise<idn_livestream[]> {
  try {
    const live_streams = await fetch_all_idn_lives(client)
    if (!live_streams.length) {
      return []
    }

    const filtered_streams = live_streams.filter((stream: any) => {
      const username = stream?.creator?.username?.toLowerCase() || ""
      return username.includes("jkt48")
    })

    const mapped = await Promise.all(
      filtered_streams.map(async (stream: any) => {
        const stream_url = await fetch_live_detail(stream.slug || stream.live_slug || "", client)
          || stream.playback_url
          || stream.stream_url
          || ""

        return {
          slug       : stream.slug || stream.live_slug || "",
          title      : stream.title || "Untitled Stream",
          image      : stream.image_url || stream.image || "",
          stream_url : stream_url,
          view_count : stream.view_count || 0,
          live_at    : normalize_live_timestamp(stream.live_at),
          user       : {
            name     : stream.creator?.name || "Unknown",
            username : stream.creator?.username || "",
            avatar   : stream.creator?.image_url || "",
          },
        } as idn_livestream
      })
    )

    return mapped.filter((stream) => stream.slug && stream.user?.username)
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_data", {})
    return []
  }
}

/**
 * - GET ALL JKT48 MEMBERS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<jkt48_member[]>} List of all JKT48 members from IDN Live
 */
export async function get_all_members(client: Client): Promise<jkt48_member[]> {
  try {
    const live_streams = await fetch_idn_live_data(client)

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
    await log_error(client, error as Error, "idn_live_get_members", {})
    return []
  }
}

/**
 * - GET IDN ROSTER MEMBERS - \\
 * @param {Client} client - Discord client
 * @param {{ max_wait_ms?: number; allow_stale?: boolean }} options - Fetch options
 * @returns {Promise<jkt48_member[]>} IDN roster members
 */
export async function get_idn_roster_members(client: Client, options?: { max_wait_ms?: number; allow_stale?: boolean }): Promise<jkt48_member[]> {
  try {
    const now = Date.now()
    if (roster_cache.data.length > 0 && (now - roster_cache.fetched_at) < IDN_ROSTER_TTL_MS) {
      return roster_cache.data
    }

    const cached = await load_idn_roster_cache(client)
    if (cached?.members?.length) {
      roster_cache.data       = cached.members
      roster_cache.fetched_at = cached.updated_at

      if ((now - cached.updated_at) < IDN_ROSTER_TTL_MS) {
        return cached.members
      }
    }

    const max_wait_ms = options?.max_wait_ms
    const allow_stale = options?.allow_stale ?? true

    if (max_wait_ms && allow_stale && roster_cache.data.length > 0) {
      const fallback = new Promise<jkt48_member[]>((resolve) => {
        setTimeout(() => resolve(roster_cache.data), max_wait_ms)
      })

      const members = await Promise.race([
        fetch_idn_roster(client),
        fallback,
      ])

      if (members.length > 0) {
        roster_cache.data       = members
        roster_cache.fetched_at = now
        await save_idn_roster_cache(client, members, "remote_or_uuid")
      }

      return members
    }

    const members = await fetch_idn_roster(client)
    roster_cache.data       = members
    roster_cache.fetched_at = now
    await save_idn_roster_cache(client, members, "remote_or_uuid")
    return members
  } catch (error) {
    await log_error(client, error as Error, "idn_live_get_roster_members", {})
    return roster_cache.data
  }
}

/**
 * - GET LIVE ROOMS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<live_room[]>} List of currently live IDN streams
 */
export async function get_live_rooms(client: Client): Promise<live_room[]> {
  try {
    const live_streams = await fetch_idn_live_data(client)

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
    await log_error(client, error as Error, "idn_live_get_live_rooms", {})
    return []
  }
}

/**
 * - GET MEMBER BY NAME - \\
 * @param {string} name - Member name or username to search
 * @param {Client} client - Discord client
 * @returns {Promise<jkt48_member | null>} Member data or null
 */
export async function get_member_by_name(name: string, client: Client): Promise<jkt48_member | null> {
  try {
    const live_streams      = await fetch_idn_live_data(client)
    const found_stream = live_streams.find((stream) => {
      const member_name = stream.user.name.toLowerCase()
      const username    = stream.user.username.toLowerCase()
      const search      = name.toLowerCase().trim()

      return member_name.includes(search)
        || username.includes(search)
        || search.includes(member_name)
        || search.includes(username)
    })

    if (!found_stream) {
      const roster_members = await get_idn_roster_members(client)
      const roster_match   = match_member_search(roster_members, name)
      if (roster_match) {
        return roster_match
      }

      const candidates = build_username_candidates(name)
      for (const candidate of candidates) {
        const profile = await fetch_public_profile_by_username(candidate, client)
        if (!profile || !is_jkt48_profile(profile)) {
          continue
        }

        return {
          slug     : "",
          name     : profile.name,
          username : profile.username,
          url      : `${IDN_LIVE_BASE}/${profile.username}`,
          image    : profile.avatar || "",
          is_live  : false,
        }
      }

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
    await log_error(client, error as Error, "idn_live_get_member_by_name", {
      name : name,
    })
    return null
  }
}

/**
 * - CHECK IF MEMBER IS LIVE - \\
 * @param {string} slug - Stream slug to check
 * @param {Client} client - Discord client
 * @returns {Promise<live_room | null>} Live room data or null
 */
export async function check_member_live(slug: string, client: Client): Promise<live_room | null> {
  try {
    const live_rooms = await get_live_rooms(client)
    return live_rooms.find((room) => room.slug === slug || room.username.toLowerCase() === slug.toLowerCase()) || null
  } catch (error) {
    await log_error(client, error as Error, "idn_live_check_member_live", { slug })
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
  const has_image          = Boolean(room.image)
  const header_section : any = {
    type       : 9,
    components : [
      {
        type    : 10,
        content : `## ${room.member_name} is LIVE on IDN!`,
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
    accent_color : 0xFF69B4,
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
          `**Channel:** @${room.username}`,
        ].join("\n"),
      },
    ],
  }
}
