/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 服务器设置的 API 路由 - \
// - server settings API router - \
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"
import * as database                 from "@shared/utils/database"

/**
 * @description create bot settings API router
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_settings_router(client: Client | null, guild_id: string): Router {
  const router = Router()

  // - 获取机器人设置接口 - \\
  // - get /api/bot-settings - \\
  router.get("/bot-settings", async (req: Request, res: Response) => {
    try {
      const settings = await database.find_one<{
        status        : string
        activity_type : string
        activity_text : string
      }>("bot_settings", { guild_id })

      res.status(200).json({
        status        : settings?.status        || "online",
        activity_type : settings?.activity_type || "Playing",
        activity_text : settings?.activity_text || "",
      })
    } catch (err) {
      console.error("[ - API BOT SETTINGS - ] Error:", err)
      res.status(500).json({ error: "Failed to get bot settings" })
    }
  })

  // - 更新机器人设置接口 - \\
  // - put /api/bot-settings - \\
  router.put("/bot-settings", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const { status, activity_type, activity_text } = req.body

      await database.update_one(
        "bot_settings",
        { guild_id },
        { guild_id, status, activity_type, activity_text, updated_at: new Date().toISOString() },
        true
      )

      const activity_map: Record<string, number> = {
        "Playing"   : 0,
        "Streaming" : 1,
        "Listening" : 2,
        "Watching"  : 3,
        "Competing" : 5,
      }

      const status_map: Record<string, "online" | "idle" | "dnd" | "invisible"> = {
        "online"    : "online",
        "idle"      : "idle",
        "dnd"       : "dnd",
        "invisible" : "invisible",
      }

      client.user?.setPresence({
        status     : status_map[status] || "online",
        activities : activity_text ? [{ name: activity_text, type: activity_map[activity_type] || 0 }] : [],
      })

      console.log(`[ - BOT SETTINGS - ] Updated: ${status} - ${activity_type} ${activity_text}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API BOT SETTINGS - ] Error:", err)
      res.status(500).json({ error: "Failed to update bot settings" })
    }
  })

  return router
}
