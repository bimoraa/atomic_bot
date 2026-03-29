/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 日志相关的 API 路由 - \
// - logs API router - \
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"
import * as database                 from "@shared/utils/database"

/**
 * @description create activity logs & transcripts API router
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_logs_router(client: Client | null, guild_id: string): Router {
  const router = Router()

  // - 获取活动日志接口 - \\
  // - get /api/activity-logs - \\
  router.get("/activity-logs", async (req: Request, res: Response) => {
    try {
      const all_logs = await database.find_many("activity_logs", { guild_id })

      const logs = all_logs
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50)

      res.status(200).json({ logs })
    } catch (err) {
      console.error("[ - API ACTIVITY LOGS - ] Error:", err)
      res.status(500).json({ error: "Failed to get activity logs" })
    }
  })

  // - 获取聊天记录接口 - \\
  // - get /api/transcripts - \\
  router.get("/transcripts", async (req: Request, res: Response) => {
    try {
      const auth_header    = req.headers.authorization
      const expected_token = process.env.BOT_API_SECRET || "dev-secret"

      if (!auth_header || auth_header !== `Bearer ${expected_token}`) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const transcripts = await database.find_many_sorted<any>(
        "ticket_transcripts",
        {},
        "close_time",
        "DESC"
      )

      const fetch_user_with_timeout = async (user_id: string, timeout_ms = 2000): Promise<string | null> => {
        if (!client) return null
        try {
          return await Promise.race([
            client.users.fetch(user_id).then(u => u.username),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout_ms)),
          ])
        } catch {
          return null
        }
      }

      const formatted = await Promise.all(transcripts.map(async (t: any) => {
        const [claimed_by_username, closed_by_username] = await Promise.all([
          t.claimed_by ? fetch_user_with_timeout(t.claimed_by) : Promise.resolve(null),
          t.closed_by  ? fetch_user_with_timeout(t.closed_by)  : Promise.resolve(null),
        ])

        return {
          transcript_id : t.transcript_id,
          ticket_id     : t.ticket_id,
          ticket_type   : t.ticket_type,
          owner_id      : t.owner_id,
          owner_tag     : t.owner_tag,
          owner_avatar  : t.owner_avatar,
          claimed_by    : claimed_by_username,
          claimed_by_id : t.claimed_by,
          closed_by     : closed_by_username,
          closed_by_id  : t.closed_by,
          issue_type    : t.issue_type,
          description   : t.description,
          message_count : t.messages?.length || 0,
          open_time     : t.open_time,
          close_time    : t.close_time,
          duration      : t.close_time - t.open_time,
        }
      }))

      res.status(200).json({ total: formatted.length, transcripts: formatted })
    } catch (err) {
      console.error("[ - API TRANSCRIPTS - ] Error:", err)
      res.status(500).json({ error: "Failed to fetch transcripts" })
    }
  })

  return router
}
