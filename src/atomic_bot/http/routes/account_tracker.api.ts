/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - account tracker API 路由，接收脚本 POST 数据并更新 Discord 消息 - \\
// - account tracker api route, receives script post data and updates discord message - \\
import { Router, Request, Response }  from "express"
import { Client, TextChannel }        from "discord.js"
import { component }                  from "@shared/utils"
import { log_error }                  from "@shared/utils/error_logger"
import {
  validate_script_key,
  derive_key_hash,
}                                     from "@atomic/integrations/cache/account_tracker_key"
import {
  get_tracker_config,
  get_all_sessions,
  upsert_session,
}                                     from "@shared/database/managers/account_tracker.manager"
import type { account_tracker_session } from "@models/account_tracker.model"

// - ─── payload 类型 ─── - \\
// - ─── payload types ─── - \\
interface tracker_post_body {
  guild_id        : string
  username        : string
  user_id         : string
  server_code     : string
  status          : string
  elapsed_time    : string
  current_money   : string
  money_received  : string
  total_earnings  : string
  average_earn    : string
  estimated_done  : string
  teleport_needed : number
}

// - ─── 构建 overview 消息（总览） ─── - \\
// - ─── build overview message (tracker panel) ─── - \\
function build_overview_message(sessions: account_tracker_session[], guild_id: string) {
  const total          = sessions.length
  const inner: any[]   = [component.text(`- Total Account: ${total}`)]

  // - 只有有账户时才挂载选择菜单 - \\
  // - only attach select menu when sessions exist - \\
  if (total > 0) {
    inner.push(
      component.select_menu(
        `account_tracker_select:${guild_id}`,
        "Select an account to view details...",
        sessions.map((s) => ({
          label       : s.username.substring(0, 100),
          value       : s.key_hash,
          description : s.status.substring(0, 100),
        })),
      ),
    )
  }

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Car Driving Indonesia  - Account Tracker"),
        ],
      }),
      component.container({ components: inner }),
    ],
  })
}

// - ─── 构建详情消息（单账户） ─── - \\
// - ─── build detail message (single account) ─── - \\
export function build_detail_message(s: account_tracker_session) {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "## Account Info:",
            `- Username: ${s.username}`,
            `- User ID: ${s.user_id}`,
            `- Server Code: ${s.server_code}`,
            `- Status: ${s.status}`,
          ]),
          component.divider(2),
          component.text([
            "## Stats",
            `- Elapsed Time: ${s.elapsed_time}`,
            `- Current Money: ${s.current_money}`,
            `- Money Received: ${s.money_received}`,
            `- Total Earnings: ${s.total_earnings}`,
            `- Average Earn: ${s.average_earn}`,
          ]),
          component.divider(2),
          component.text([
            "## Estimated to Done",
            `- Estimated Time: ${s.estimated_done}`,
            `- Teleport Needed: ${s.teleport_needed}x`,
          ]),
        ],
      }),
    ],
  })
}

/**
 * @description create the account tracker express router
 * @param client - Discord client instance
 * @returns Express Router
 */
export function create_account_tracker_router(client: Client): Router {
  const router = Router()

  // - POST /api/account-tracker - \\
  // - receives account farming data from scripts and updates the tracker panel - \\
  router.post("/account-tracker", async (req: Request, res: Response) => {
    try {
      // - 从 Authorization 头中提取 script_key - \\
      // - extract script_key from authorization header - \\
      const auth_header = req.headers["authorization"] as string | undefined
      if (!auth_header || auth_header.trim().length === 0) {
        res.status(401).json({ success: false, error: "Missing Authorization header" })
        return
      }

      const script_key = auth_header.trim()

      // - 通过 Luarmor 验证密钥（有内存缓存） - \\
      // - validate key via luarmor (backed by in-memory cache) - \\
      const is_valid = await validate_script_key(script_key)
      if (!is_valid) {
        res.status(401).json({ success: false, error: "Invalid or expired script key" })
        return
      }

      // - 验证请求体字段 - \\
      // - validate required body fields - \\
      const body = req.body as tracker_post_body
      const {
        guild_id,
        username,
        user_id,
        server_code,
        status,
        elapsed_time,
        current_money,
        money_received,
        total_earnings,
        average_earn,
        estimated_done,
        teleport_needed,
      } = body

      if (!guild_id || !username || !user_id) {
        res.status(400).json({ success: false, error: "Missing required fields: guild_id, username, user_id" })
        return
      }

      const key_hash = derive_key_hash(script_key)

      // - 更新 DB 中的账户 session - \\
      // - upsert account session in db - \\
      const session: account_tracker_session = {
        key_hash,
        guild_id,
        username        : String(username).substring(0, 100),
        user_id         : String(user_id),
        server_code     : String(server_code  ?? ""),
        status          : String(status        ?? "Unknown"),
        elapsed_time    : String(elapsed_time  ?? "00:00:00"),
        current_money   : String(current_money ?? "Rp. 0"),
        money_received  : String(money_received ?? "Rp. 0"),
        total_earnings  : String(total_earnings ?? "Rp. 0"),
        average_earn    : String(average_earn   ?? "Rp. 0 /h"),
        estimated_done  : String(estimated_done ?? "-"),
        teleport_needed : Number(teleport_needed ?? 0),
        updated_at      : Date.now(),
      }

      await upsert_session(session)

      // - 获取 guild 的 tracker 配置，更新 overview 消息 - \\
      // - get guild tracker config and update the overview message - \\
      const config = await get_tracker_config(guild_id)
      if (config) {
        try {
          const guild   = await client.guilds.fetch(guild_id).catch(() => null)
          const channel = guild
            ? await guild.channels.fetch(config.channel_id).catch(() => null) as TextChannel | null
            : null
          const message = channel
            ? await channel.messages.fetch(config.message_id).catch(() => null)
            : null

          if (message) {
            const all_sessions = await get_all_sessions(guild_id)
            await message.edit(build_overview_message(all_sessions, guild_id))
          }
        } catch (edit_err) {
          console.log("[ - ACCOUNT TRACKER API - ] Failed to edit overview message:", edit_err)
        }
      }

      res.status(200).json({ success: true })
    } catch (err) {
      await log_error(client, err as Error, "Account Tracker API POST", {
        ip: req.ip,
      }).catch(() => {})
      res.status(500).json({ success: false, error: "Internal server error" })
    }
  })

  return router
}
