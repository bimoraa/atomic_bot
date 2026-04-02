/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - bot 基本信息和统计数据的 API 路由 - \
// - bot info and stats API router - \
import { Router, Request, Response } from "express"
import { Client, ChannelType }       from "discord.js"

/**
 * @description create bot info & stats API router
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_bot_router(client: Client | null, guild_id: string): Router {
  const router = Router()

  router.get("/stats", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      res.status(200).json({
        guilds    : client.guilds.cache.size,
        users     : client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
        channels  : client.channels.cache.size,
        uptime    : process.uptime(),
        memory    : process.memoryUsage(),
        timestamp : new Date().toISOString(),
      })
    } catch (err) {
      console.error("[ - API STATS - ] Error:", err)
      res.status(500).json({ error: "Failed to get stats" })
    }
  })

  router.get("/guilds", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const guilds = client.guilds.cache.map(g => ({
        id           : g.id,
        name         : g.name,
        icon         : g.iconURL(),
        member_count : g.memberCount,
        owner_id     : g.ownerId,
      }))

      res.status(200).json({ guilds })
    } catch (err) {
      console.error("[ - API GUILDS - ] Error:", err)
      res.status(500).json({ error: "Failed to get guilds" })
    }
  })

  router.get("/server-info", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const guild = client.guilds.cache.get(guild_id)
      if (!guild) return res.status(404).json({ error: "Main guild not found" })

      res.status(200).json({
        server_name    : guild.name,
        server_icon    : guild.iconURL({ size: 128 }),
        total_members  : guild.memberCount,
        voice_channels : guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
        text_channels  : guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
        categories     : guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
        roles          : guild.roles.cache.size,
      })
    } catch (err) {
      console.error("[ - API SERVER INFO - ] Error:", err)
      res.status(500).json({ error: "Failed to get server info" })
    }
  })

  router.get("/bot-info", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const guild      = client.guilds.cache.get(guild_id)
      const bot_member = guild ? await guild.members.fetch(client.user?.id || "").catch(() => null) : null
      const uptime     = process.uptime()

      res.status(200).json({
        nickname : bot_member?.nickname || client.user?.username || "Atomic Bot",
        status   : "Online",
        uptime   : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        ping     : client.ws.ping,
      })
    } catch (err) {
      console.error("[ - API BOT INFO - ] Error:", err)
      res.status(500).json({ error: "Failed to get bot info" })
    }
  })

  // - 专用于 web 仪表盘的机器人统计接口，包含数字形式的内存数据和 ping - \\
  // - dedicated bot stats endpoint for web dashboard, numeric memory and ping values - \\
  router.get("/bot-stats", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) {
        return res.status(503).json({ status: "starting", bot_ready: false })
      }

      const mem = process.memoryUsage()

      // - 通过一次轻量 REST 请求测量 API 延迟 - \\
      // - measure API latency via a lightweight REST call - \\
      let api_latency_ms = client.ws.ping
      try {
        const api_start         = Date.now()
        await (client.rest as any).get("/gateway")
        api_latency_ms  = Date.now() - api_start
      } catch {}

      res.status(200).json({
        status        : "alive",
        bot_ready     : true,
        ws_ping       : client.ws.ping,
        api_latency   : api_latency_ms,
        uptime        : process.uptime(),
        memory        : {
          rss_mb        : parseFloat((mem.rss        / 1024 / 1024).toFixed(2)),
          heap_used_mb  : parseFloat((mem.heapUsed   / 1024 / 1024).toFixed(2)),
          heap_total_mb : parseFloat((mem.heapTotal  / 1024 / 1024).toFixed(2)),
          external_mb   : parseFloat((mem.external   / 1024 / 1024).toFixed(2)),
        },
        timestamp     : Date.now(),
      })
    } catch (err) {
      console.error("[ - API BOT STATS - ] Error:", err)
      res.status(500).json({ error: "Failed to get stats" })
    }
  })

  router.post("/bot-nickname", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const { nickname } = req.body
      const guild        = client.guilds.cache.get(guild_id)
      if (!guild) return res.status(404).json({ error: "Main guild not found" })

      const bot_member = await guild.members.fetch(client.user?.id || "").catch(() => null)
      if (bot_member) {
        await bot_member.setNickname(nickname || null)
        console.log(`[ - API BOT NICKNAME - ] Updated to: ${nickname}`)
      }

      res.status(200).json({ success: true, nickname })
    } catch (err) {
      console.error("[ - API BOT NICKNAME - ] Error:", err)
      res.status(500).json({ error: "Failed to update nickname" })
    }
  })

  return router
}
