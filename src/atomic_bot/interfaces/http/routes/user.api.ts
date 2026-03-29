/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 用户数据相关的 API 路由 - \
// - user data API router - \
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"
import * as database                 from "@shared/utils/database"

// - 成员缓存 - \\
// - member cache - \\
const __member_cache : Map<string, { data: any; timestamp: number }> = new Map()
const __cache_ttl    = 5 * 60 * 1000
const __cdn          = "https://cdn.discordapp.com"
const __two_hours    = 2 * 60 * 60 * 1000

const __role_supporter = "1357767950421065981"
const __role_staff     = "1264915024707588208"

// - 积分成员缓存 - \\
// - credits cache - \\
type credits_member = { id: string; username: string; avatar_url: string }
type credits_cache  = { supporters: credits_member[]; staff: credits_member[]; updated_at: number }

type raw_member = {
  user  : { id: string; username: string; global_name?: string; avatar?: string }
  nick ?: string
  avatar?: string
  roles  : string[]
}

let __credits_mem_cache       : credits_cache | null  = null
let __credits_refreshing      : boolean               = false
let __credits_refresh_promise : Promise<void> | null  = null

// - 构建头像 URL - \\
// - avatar url builder - \\
function get_member_avatar(m: raw_member, guild_id: string): string {
  if (m.avatar) {
    const ext = m.avatar.startsWith("a_") ? "gif" : "png"
    return `${__cdn}/guilds/${guild_id}/users/${m.user.id}/avatars/${m.avatar}.${ext}?size=64`
  }
  if (m.user.avatar) {
    const ext = m.user.avatar.startsWith("a_") ? "gif" : "png"
    return `${__cdn}/avatars/${m.user.id}/${m.user.avatar}.${ext}?size=64`
  }
  return `${__cdn}/embed/avatars/${Number(BigInt(m.user.id) >> BigInt(22)) % 6}.png`
}

/**
 * @description fetch all guild members via REST pagination and refresh in-memory credits cache
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Promise<void>
 */
async function refresh_credits_cache(client: Client, guild_id: string): Promise<void> {
  if (__credits_refreshing) return __credits_refresh_promise ?? undefined

  __credits_refreshing      = true
  __credits_refresh_promise = (async () => {
    try {
      console.info("[ - API CREDITS MEMBERS - ] Refresh started")

      const all: raw_member[] = []
      let   after             = ""

      while (true) {
        const query = after ? `?limit=1000&after=${after}` : "?limit=1000"
        const page  = await (client as any).rest.get(`/guilds/${guild_id}/members${query}`) as raw_member[]

        all.push(...page)
        if (page.length < 1000) break
        after = page[page.length - 1]!.user.id
      }

      const to_member = (m: raw_member): credits_member => ({
        id         : m.user.id,
        username   : m.nick ?? m.user.global_name ?? m.user.username,
        avatar_url : get_member_avatar(m, guild_id),
      })

      const supporters = all.filter(m => m.roles.includes(__role_supporter)).map(to_member)
      const staff      = all.filter(m => m.roles.includes(__role_staff)).map(to_member)

      __credits_mem_cache = { supporters, staff, updated_at: Date.now() }
      console.info(`[ - API CREDITS MEMBERS - ] Updated: ${supporters.length} supporters, ${staff.length} staff`)

      // - 在后台持久化到数据库 - \\
      // - persist to db in background - \\
      database.update_one(
        "credits_members",
        { id: "cache" },
        { id: "cache", supporters, staff, updated_at: Date.now() },
        true
      ).catch(err => console.error("[ - API CREDITS MEMBERS - ] DB persist failed:", err))
    } catch (err) {
      console.error("[ - API CREDITS MEMBERS - ] Refresh failed:", err)
    } finally {
      __credits_refreshing      = false
      __credits_refresh_promise = null
    }
  })()

  return __credits_refresh_promise
}

/**
 * @description warm credits in-memory cache from DB on startup
 * @returns Promise<void>
 */
export async function warm_credits_cache_from_db(): Promise<void> {
  try {
    const db_cached = await Promise.race([
      database.find_one<credits_cache>("credits_members", { id: "cache" }),
      new Promise<null>(r => setTimeout(() => r(null), 5000)),
    ])

    if (db_cached && Array.isArray(db_cached.supporters) && db_cached.supporters.length > 0) {
      __credits_mem_cache = db_cached
      console.info(`[ - API CREDITS MEMBERS - ] Warmed from DB: ${db_cached.supporters.length} supporters, ${db_cached.staff.length} staff`)
    }
  } catch (err) {
    console.error("[ - API CREDITS MEMBERS - ] DB warm failed:", err)
  }
}

/**
 * @description create user & member API router
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_user_router(client: Client | null, guild_id: string): Router {
  const router = Router()

  // - 获取用户接口 - \\
  // - get /api/user/:id - \\
  router.get("/user/:id", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const user = await client.users.fetch(req.params.id).catch(() => null)
      if (!user) return res.status(404).json({ error: "User not found" })

      res.status(200).json({
        id       : user.id,
        username : user.username,
        tag      : user.tag,
        avatar   : user.displayAvatarURL({ size: 128 }),
        bot      : user.bot,
      })
    } catch (err) {
      console.error("[ - API USER - ] Error:", err)
      res.status(500).json({ error: "Failed to get user" })
    }
  })

  // - 获取成员接口 - \\
  // - get /api/member/:id - \\
  router.get("/member/:id", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const user_id = req.params.id
      const cached  = __member_cache.get(user_id)

      if (cached && Date.now() - cached.timestamp < __cache_ttl) {
        console.log(`[ - API MEMBER - ] Cache hit for ${user_id}`)
        return res.status(200).json(cached.data)
      }

      const guild = client.guilds.cache.get(guild_id)
      if (!guild) return res.status(404).json({ error: "Guild not found" })

      const member = await guild.members.fetch(user_id).catch(() => null)
      if (!member) return res.status(404).json({ error: "Member not found" })

      const roles     = member.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
          id       : r.id,
          name     : r.name,
          color    : r.hexColor,
          icon     : r.iconURL({ size: 64 }) || r.icon || null,
          position : r.position,
        }))

      const full_user = await client.users.fetch(user_id, { force: true }).catch(() => null)

      const data = {
        id           : member.id,
        username     : member.user.username,
        tag          : member.user.tag,
        avatar       : member.user.displayAvatarURL({ size: 256 }),
        banner       : full_user?.bannerURL({ size: 512 }) || null,
        display_name : member.displayName,
        nickname     : member.nickname,
        bot          : member.user.bot,
        roles,
        joined_at    : member.joinedTimestamp,
        created_at   : member.user.createdTimestamp,
        premium_since: member.premiumSinceTimestamp,
      }

      __member_cache.set(user_id, { data, timestamp: Date.now() })
      console.log(`[ - API MEMBER - ] Cached ${user_id}`)

      res.status(200).json(data)
    } catch (err) {
      console.error("[ - API MEMBER - ] Error:", err)
      res.status(500).json({ error: "Failed to get member" })
    }
  })

  // - 获取积分成员列表接口 - \\
  // - get /api/credits-members - \\
  router.get("/credits-members", async (req: Request, res: Response) => {
    const force_refresh = req.query.refresh === "1"

    try {
      const is_stale = !__credits_mem_cache?.updated_at || (Date.now() - __credits_mem_cache.updated_at) > __two_hours
      const has_data = __credits_mem_cache && __credits_mem_cache.supporters.length > 0

      if (has_data && !force_refresh) {
        if (is_stale && client?.isReady()) {
          refresh_credits_cache(client, guild_id).catch(() => {})
        }
        console.info(`[ - API CREDITS MEMBERS - ] Serving from memory`)
        return res.status(200).json({ supporters: __credits_mem_cache!.supporters, staff: __credits_mem_cache!.staff })
      }

      if (client?.isReady()) {
        await Promise.race([
          refresh_credits_cache(client, guild_id),
          new Promise<void>(r => setTimeout(r, 30000)),
        ])
      }

      if (__credits_mem_cache && __credits_mem_cache.supporters.length > 0) {
        return res.status(200).json({ supporters: __credits_mem_cache.supporters, staff: __credits_mem_cache.staff })
      }

      return res.status(200).json({ supporters: [], staff: [], loading: true })
    } catch (err) {
      console.error("[ - API CREDITS MEMBERS - ] Error:", err)
      res.status(500).json({ error: "Failed to get credits members" })
    }
  })

  // - 获取角色成员接口 - \\
  // - get /api/role-members/:role_id - \\
  router.get("/role-members/:role_id", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const role_id    = req.params.role_id
      const all: raw_member[] = []
      let   after: string | null = null

      while (true) {
        const query = after ? `?limit=1000&after=${after}` : "?limit=1000"
        const page  = await client.rest.get(`/guilds/${guild_id}/members${query}`) as raw_member[]

        all.push(...page)
        if (page.length < 1000) break
        after = page[page.length - 1]!.user.id
      }

      const filtered = all.filter(m => m.roles.includes(role_id))
      const members  = filtered.map(m => ({
        id         : m.user.id,
        username   : m.nick ?? m.user.global_name ?? m.user.username,
        avatar_url : get_member_avatar(m, guild_id),
      }))

      console.info(`[ - API ROLE MEMBERS - ] Role ${role_id}: ${members.length} / ${all.length} members`)
      res.status(200).json({ members })
    } catch (err) {
      console.error("[ - API ROLE MEMBERS - ] Error:", err)
      res.status(500).json({ error: "Failed to get role members" })
    }
  })

  return router
}
