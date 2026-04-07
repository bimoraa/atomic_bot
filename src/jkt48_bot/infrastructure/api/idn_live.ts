/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

/**
 * - IDN Live API 客户端 - \\
 * - IDN live api client - \\
 * Direct IDN Live API integration for JKT48 members
 */ 

import axios           from "axios"
import { Client }      from "discord.js"
import * as db         from "@utils/database"
import * as file       from "@utils/file"
import { log_error }   from "@utils/error_logger"

const __idn_live_base         = "https://www.idn.app"
const __idn_mobile_api        = "https://mobile-api.idntimes.com/v3/livestreams"
const __idn_detail_api        = "https://api.idn.app/api/v4/livestream"
const __idn_graphql_api       = "https://api.idn.app/graphql"
const __idn_roster_api_base   = process.env.JKT48_SHOWROOM_API_BASE || "https://jkt48showroom-api.vercel.app"
const __idn_cfg_path          = process.env.JKT48_IDN_CFG_PATH || file.resolve("assets", "jkt48", "jkt48_idn.cfg")
const __idn_roster_collection = "idn_roster_cache"
const __idn_roster_cache_key  = "default"
const __idn_mobile_key        = "1ccc5bc4-8bb4-414c-b524-92d11a85a818"
const __idn_detail_key        = "123f4c4e-6ce1-404d-8786-d17e46d65b5c"
const __idn_user_agent        = "IDN/6.41.1 (com.idntimes.IDNTimes; build:745; iOS 17.2.1) Alamofire/5.1.0"
const __idn_detail_agent      = "Android/14/SM-A528B/6.47.4"
const __idn_roster_ttl_ms     = 1000 * 60 * 60 * 6

const detail_cache      = new Map<string, string>()
const detail_failed_cache = new Map<string, number>()
const __detail_failed_ttl  = 60 * 1000
const __detail_retry_max   = 2
const __detail_retry_delay = 3000
const roster_cache      = {
  data       : [] as jkt48_member[],
  fetched_at : 0,
}
const live_data_cache   = {
  data       : [] as idn_livestream[],
  fetched_at : 0,
}
const __live_data_cache_ttl = 30 * 1000

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
 * - 构建 IDN 用户主页 URL - \\
 * - build idn profile url - \\
 * @param {string} username - iDN username
 * @returns {string} profile URL
 */
function build_idn_profile_url(username: string): string {
  if (!username) return __idn_live_base
  return `${__idn_live_base}/${username}`
}

/**
 * - 构建 IDN 直播 URL - \\
 * - build idn live url - \\
 * @param {string} username - iDN username
 * @param {string} slug - live slug
 * @returns {string} live URL
 */
function build_idn_live_url(username: string, slug: string): string {
  if (!username) return __idn_live_base
  if (!slug) return `${__idn_live_base}/${username}/live`
  return `${__idn_live_base}/${username}/live/${slug}`
}

/**
 * - 标准化 IDN 直播时间戳 - \\
 * - normalize idn live timestamp - \\
 * @param {number | string} live_at - live timestamp value
 * @returns {string} iSO date string
 */
function normalize_live_timestamp(live_at: number | string): string {
  const numeric = typeof live_at === "string" ? Number(live_at) : live_at
  const base_ms = Number.isFinite(numeric) ? numeric : Date.now()
  const ms      = base_ms < 1_000_000_000_000 ? base_ms * 1000 : base_ms
  return new Date(ms).toISOString()
}

/**
 * - 加载 IDN 名单缓存 - \\
 * - load idn roster cache - \\
 * @param {Client} client - discord client
 * @returns {Promise<idn_roster_cache | null>} cached roster
 */
async function load_idn_roster_cache(client: Client): Promise<idn_roster_cache | null> {
  if (!db.is_connected()) {
    return null
  }

  try {
    return await db.find_one<idn_roster_cache>(__idn_roster_collection, {
      key : __idn_roster_cache_key,
    })
  } catch (error) {
    await log_error(client, error as Error, "idn_live_load_roster_cache", {})
    return null
  }
}

/**
 * - 保存 IDN 名单缓存 - \\
 * - save idn roster cache - \\
 * @param {Client} client - discord client
 * @param {jkt48_member[]} members - member list
 * @param {string} source - data source
 * @returns {Promise<void>}
 */
async function save_idn_roster_cache(client: Client, members: jkt48_member[], source: string): Promise<void> {
  if (!db.is_connected() || members.length === 0) {
    return
  }

  try {
    await db.update_one<idn_roster_cache>(
      __idn_roster_collection,
      { key: __idn_roster_cache_key },
      {
        key        : __idn_roster_cache_key,
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
 * - 获取 IDN UUID 列表 - \\
 * - fetch idn uuid list - \\
 * @param {Client} client - discord client
 * @returns {Promise<string[]>} uUID list
 */
async function fetch_idn_uuid_list(client: Client): Promise<string[]> {
  try {
    if (!file.exists(__idn_cfg_path)) {
      return []
    }

    const payload = file.read_json<idn_cfg_payload>(__idn_cfg_path)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const uuids = new Set<string>()

    for (const record of records) {
      for (const account of Object.values(record) as any[]) {
        if (account?.uuid) {
          uuids.add(account.uuid)
        }
      }
    }

    return Array.from(uuids)
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_uuid_list", {
      path : __idn_cfg_path,
    })
    return []
  }
}

/**
 * - 通过用户名获取 IDN UUID - \\
 * - get idn uuid by username - \\
 * @param {string} username - iDN username
 * @returns {string | null} uUID or null
 */
export function get_idn_uuid_by_username(username: string): string | null {
  try {
    if (!file.exists(__idn_cfg_path)) {
      return null
    }

    const payload = file.read_json<idn_cfg_payload>(__idn_cfg_path)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const search = username.toLowerCase().trim()

    for (const record of records) {
      for (const account of Object.values(record) as any[]) {
        if (account?.username?.toLowerCase() === search && account?.uuid) {
          return account.uuid
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * - 构建名单接口端点 - \\
 * - build roster endpoints - \\
 * @param {string} base - roster API base
 * @returns {string[]} endpoint list
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
 * - 匹配成员搜索 - \\
 * - match member search - \\
 * @param {jkt48_member[]} members - member list
 * @param {string} search - search keyword
 * @returns {jkt48_member | null} matched member
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
 * - 构建用户名候选列表 - \\
 * - build username candidates - \\
 * @param {string} input - raw user input
 * @returns {string[]} candidate usernames
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
 * - 检查 JKT48 用户主页 - \\
 * - check jkt48 profile - \\
 * @param {idn_public_profile} profile - public profile
 * @returns {boolean} true when profile is JKT48
 */
function is_jkt48_profile(profile: idn_public_profile): boolean {
  const name     = profile.name.toLowerCase()
  const username = profile.username.toLowerCase()
  return name.includes("jkt48") || username.includes("jkt48")
}

/**
 * - 加载 IDN 配置成员 - \\
 * - load idn cfg members - \\
 * @param {Client} client - discord client
 * @returns {Promise<jkt48_member[]>} member list
 */
async function load_idn_cfg_members(client: Client): Promise<jkt48_member[]> {
  try {
    if (!file.exists(__idn_cfg_path)) {
      return []
    }

    const payload = file.read_json<idn_cfg_payload>(__idn_cfg_path)
    const records = [
      payload?.officials || {},
      payload?.members || {},
    ]

    const members: jkt48_member[] = []

    for (const record of records) {
      for (const account of Object.values(record) as any[]) {
        if (!account?.username || !account?.name) continue

        members.push({
          slug      : account.username,
          name      : account.name,
          username  : account.username,
          url       : build_idn_profile_url(account.username),
          image     : "",
          is_live   : false,
        })
      }
    }

    return members
  } catch (error) {
    await log_error(client, error as Error, "idn_live_load_cfg_members", {
      path : __idn_cfg_path,
    })
    return []
  }
}

/**
 * - 获取所有 IDN 直播 - \\
 * - fetch all idn lives - \\
 * @param {Client} client - discord client
 * @returns {Promise<any[]>} raw IDN live list
 */
async function fetch_all_idn_lives(client: Client): Promise<any[]> {
  const results: any[] = []
  let page             = 1

  while (page <= 50) {
    try {
      const response = await axios.get(__idn_mobile_api, {
        timeout : 15000,
        params  : {
          category : "all",
          page     : page,
          _        : Date.now(),
        },
        headers : {
          Host              : "mobile-api.idntimes.com",
          "x-api-key"       : __idn_mobile_key,
          "User-Agent"      : __idn_user_agent,
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
 * - 获取 IDN 直播详情 - \\
 * - fetch idn live detail - \\
 * @param {string} slug - live slug
 * @param {Client} client - discord client
 * @returns {Promise<string | null>} playback URL or null
 */
async function fetch_live_detail(slug: string, client: Client): Promise<string | null> {
  if (!slug) return null

  if (detail_cache.has(slug)) {
    return detail_cache.get(slug) || null
  }

  // - 跳过最近失败的 slug 以避免粘労 IDN API - \\
  // - skip recently failed slugs to avoid hammering IDN API - \\
  const failed_at = detail_failed_cache.get(slug)
  if (failed_at && (Date.now() - failed_at) < __detail_failed_ttl) {
    return null
  }

  for (let attempt = 1; attempt <= __detail_retry_max; attempt++) {
    try {
      const response = await axios.get(`${__idn_detail_api}/${slug}`, {
        timeout : 20000,
        headers : {
          "User-Agent" : __idn_detail_agent,
          "x-api-key"  : __idn_detail_key,
        },
      })

      const stream_url = response.data?.data?.playback_url || null
      if (stream_url) {
        detail_cache.set(slug, stream_url)
        detail_failed_cache.delete(slug)
      }
      return stream_url

    } catch (error: any) {
      const status         = error?.response?.status as number | undefined
      const is_timeout     = error?.code === "ECONNABORTED" || error?.message?.includes("timeout")
      const is_server_err  = status !== undefined && status >= 500

      if (attempt < __detail_retry_max) {
        console.warn(`[ - IDN LIVE - ] fetch_live_detail attempt ${attempt} failed for ${slug} (${status ?? error?.code ?? "unknown"}), retrying...`)
        await new Promise(resolve => setTimeout(resolve, __detail_retry_delay))
        continue
      }

      // - 所有尝试均已耗尽 - \\
      // - all attempts exhausted - \\
      detail_failed_cache.set(slug, Date.now())
      if (is_timeout || is_server_err) {
        // - 瞬时错误（超时/5XX），跳过日志以减少噪音 - \\
        // - transient error (timeout / 5xx), skip logging to avoid noise - \\
        console.warn(`[ - IDN LIVE - ] fetch_live_detail skipped for ${slug}: ${is_timeout ? "timeout" : `HTTP ${status}`}`)
      } else {
        await log_error(client, error as Error, "idn_live_fetch_detail_api", { slug, attempt }).catch(() => {})
      }
      return null
    }
  }

  return null
}

/**
 * - 获取公开用户主页 - \\
 * - fetch public profile - \\
 * @param {string} username - iDN username
 * @param {Client} client - discord client
 * @returns {Promise<idn_public_profile | null>} public profile data or null
 */
async function fetch_public_profile_by_username(username: string, client: Client): Promise<idn_public_profile | null> {
  try {
    const response = await axios.post(__idn_graphql_api, {
      query     : "query GetProfileByUsername($username: String!) { getPublicProfileByUsername(username: $username) { name username uuid avatar } }",
      variables : { username },
    }, {
      timeout : 15000,
      headers : {
        "User-Agent"   : __idn_user_agent,
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
 * - 通过 UUID 获取公开用户主页 - \\
 * - fetch public profile by uuid - \\
 * @param {string} uuid - iDN user UUID
 * @param {Client} client - discord client
 * @returns {Promise<idn_public_profile | null>} public profile data or null
 */
async function fetch_public_profile_by_uuid(uuid: string, client: Client): Promise<idn_public_profile | null> {
  try {
    const response = await axios.post(__idn_graphql_api, {
      query     : "query GetPublicProfile($uuid: String!) { getPublicProfile(uuid: $uuid) { name username uuid avatar } }",
      variables : { uuid },
    }, {
      timeout : 15000,
      headers : {
        "User-Agent"   : __idn_user_agent,
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
 * - 通过 UUID 获取 IDN 名单 - \\
 * - fetch idn roster by uuid - \\
 * @param {Client} client - discord client
 * @returns {Promise<jkt48_member[]>} roster list
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
        url      : build_idn_profile_url(profile.username),
        image    : profile.avatar || "",
        is_live  : false,
      })
    }
  }

  return members
}

/**
 * - 获取 IDN 名单 - \\
 * - fetch idn roster - \\
 * @param {Client} client - discord client
 * @returns {Promise<jkt48_member[]>} roster list
 */
async function fetch_idn_roster(client: Client): Promise<jkt48_member[]> {
  try {
    const endpoints = build_roster_endpoints(__idn_roster_api_base)
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
            url      : username ? build_idn_profile_url(username) : "",
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
        base_url  : __idn_roster_api_base,
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
      base_url : __idn_roster_api_base,
    })
    return []
  }
}

/**
 * - 获取 IDN 直播数据 - \\
 * - fetch idn live data - \\
 * @param {Client} client - discord client
 * @returns {Promise<idn_livestream[]>} iDN Live data
 */
async function fetch_idn_live_data(client: Client): Promise<idn_livestream[]> {
  const now = Date.now()
  if (live_data_cache.fetched_at > 0 && (now - live_data_cache.fetched_at) < __live_data_cache_ttl) {
    return live_data_cache.data
  }

  try {
    const live_streams = await fetch_all_idn_lives(client)
    if (!live_streams.length) {
      return []
    }

    const cfg_members = await load_idn_cfg_members(client)
    const cfg_usernames = new Set(
      cfg_members
        .map((member) => member.username.toLowerCase())
        .filter(Boolean)
    )

    const filtered_streams = live_streams.filter((stream: any) => {
      const username = stream?.creator?.username?.toLowerCase() || ""
      return username.includes("jkt48") || cfg_usernames.has(username)
    })

    const mapped: idn_livestream[] = []
    for (const stream of filtered_streams) {
      const stream_url = await fetch_live_detail(stream.slug || stream.live_slug || "", client)
        || stream.playback_url
        || stream.stream_url
        || ""

      mapped.push({
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
      } as idn_livestream)
    }

    const result = mapped.filter((stream) => stream.slug && stream.user?.username)
    live_data_cache.data       = result
    live_data_cache.fetched_at = Date.now()
    return result
  } catch (error) {
    await log_error(client, error as Error, "idn_live_fetch_data", {})
    return []
  }
}

/**
 * - 获取所有 JKT48 成员 - \\
 * - get all jkt48 members - \\
 * @param {Client} client - discord client
 * @returns {Promise<jkt48_member[]>} list of all JKT48 members from IDN Live
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
          url      : build_idn_profile_url(stream.user.username),
          image    : stream.user.avatar || stream.image,
          is_live  : false,
        })
      }
    }

    return Array.from(unique_members.values())
  } catch (error) {
    await log_error(client, error as Error, "idn_live_get_members", {}).catch(() => {})
    // - 回退到配置文件 - \\
    // - fallback to config file - \\
    console.log("[ - JKT48 - ] API failed, using config file fallback")
    return await load_idn_cfg_members(client)
  }
}

/**
 * - 获取 IDN 名单成员 - \\
 * - get idn roster members - \\
 * @param {Client} client - discord client
 * @param {{ max_wait_ms?: number; allow_stale?: boolean }} options - fetch options
 * @returns {Promise<jkt48_member[]>} iDN roster members
 */
export async function get_idn_roster_members(client: Client, options?: { max_wait_ms?: number; allow_stale?: boolean }): Promise<jkt48_member[]> {
  try {
    const now = Date.now()
    if (roster_cache.data.length > 0 && (now - roster_cache.fetched_at) < __idn_roster_ttl_ms) {
      return roster_cache.data
    }

    const cached = await load_idn_roster_cache(client)
    if (cached?.members?.length) {
      roster_cache.data       = cached.members
      roster_cache.fetched_at = cached.updated_at

      if ((now - cached.updated_at) < __idn_roster_ttl_ms) {
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
    await log_error(client, error as Error, "idn_live_get_roster_members", {}).catch(() => {})
    // - 回退到缓存或配置文件 - \\
    // - fallback to cache or config file - \\
    if (roster_cache.data.length > 0) {
      console.log("[ - JKT48 - ] Roster API failed, using cache")
      return roster_cache.data
    }
    console.log("[ - JKT48 - ] Roster API failed, using config file fallback")
    return await load_idn_cfg_members(client)
  }
}

/**
 * - 获取直播间列表 - \\
 * - get live rooms - \\
 * @param {Client} client - discord client
 * @returns {Promise<live_room[]>} list of currently live IDN streams
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
        url         : build_idn_live_url(stream.user.username, stream.slug),
      }
    })
  } catch (error) {
    await log_error(client, error as Error, "idn_live_get_live_rooms", {})
    return []
  }
}

/**
 * - 通过名字获取成员 - \\
 * - get member by name - \\
 * @param {string} name - member name or username to search
 * @param {Client} client - discord client
 * @returns {Promise<jkt48_member | null>} member data or null
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
          url      : build_idn_profile_url(profile.username),
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
      url      : build_idn_profile_url(found_stream.user.username),
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
 * - 检查成员是否正在直播 - \\
 * - check if member is live - \\
 * @param {string} slug - stream slug to check
 * @param {Client} client - discord client
 * @returns {Promise<live_room | null>} live room data or null
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
 * - 格式化直播间组件 - \\
 * - format live room component - \\
 * @param {live_room} room - live room data
 * @returns {object} component container for live room
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
