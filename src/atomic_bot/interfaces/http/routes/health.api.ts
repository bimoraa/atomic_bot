/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 健康检查和根路由的 API - \
// - health check and root API router - \
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"

/**
 * @description create health & root API router
 * @param get_bot_ready - Getter for bot_ready flag
 * @param client        - Discord client instance
 * @param port          - HTTP server port
 * @param public_url    - Public base URL
 * @returns Express Router
 */
export function create_health_router(
  get_bot_ready : () => boolean,
  client        : Client | null,
  port          : number,
  public_url    : string,
): Router {
  const router = Router()

  router.get("/health", (req: Request, res: Response) => {
    const is_ready = (client?.isReady() && get_bot_ready()) || false
    const status   = is_ready ? "alive" : "starting"

    res.status(is_ready ? 200 : 503).send(status)
  })

  router.get("/health/detailed", (req: Request, res: Response) => {
    const is_ready = (client?.isReady() && get_bot_ready()) || false
    const mem      = process.memoryUsage()

    res.status(is_ready ? 200 : 503).json({
      status     : is_ready ? "alive" : "starting",
      bot_ready  : is_ready,
      uptime     : process.uptime(),
      memory     : {
        rss        : `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
        heap_used  : `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heap_total : `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      guilds     : client?.guilds?.cache?.size || 0,
      ping       : client?.ws?.ping || -1,
      timestamp  : new Date().toISOString(),
    })
  })

  router.get("/", (req: Request, res: Response) => {
    res.status(200).json({
      status    : "running",
      service   : "atomic_bot",
      bot_ready : client?.isReady() || false,
      port,
      url       : public_url,
      endpoints : {
        health  : `${public_url}/health`,
        webhook : `${public_url}/webhook/github`,
        api     : {
          stats       : `${public_url}/api/stats`,
          guilds      : `${public_url}/api/guilds`,
          server_info : `${public_url}/api/server-info`,
          bot_info    : `${public_url}/api/bot-info`,
          audit_logs  : `${public_url}/api/audit-logs`,
        },
      },
    })
  })

  return router
}
