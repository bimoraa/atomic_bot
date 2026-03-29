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
