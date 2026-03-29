/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - Express HTTP 服务器的启动和路由挂载 - \
// - express HTTP server setup and route mounting - \
import express                                    from "express"
import { Client }                                from "discord.js"
import cors                                      from "cors"
import { create_health_router }                  from "./routes/health.api"
import { create_webhook_router }                 from "./routes/webhook.api"
import { create_bot_router }                     from "./routes/bot.api"
import { create_user_router }                    from "./routes/user.api"
import { create_guild_router }                   from "./routes/guild.api"
import { create_settings_router }                from "./routes/settings.api"
import { create_auto_responder_router }          from "./routes/auto_responder.api"
import { create_reaction_roles_router }          from "./routes/reaction_roles.api"
import { create_custom_commands_router }         from "./routes/custom_commands.api"
import { create_logs_router }                    from "./routes/logs.api"

export { warm_credits_cache_from_db } from "./routes/user.api"

const __port          = parseInt(process.env.PORT || process.env.WEBHOOK_PORT || "3456", 10)
const __public_url    = process.env.PUBLIC_URL || `http://localhost:${__port}`
const __main_guild_id = process.env.MAIN_GUILD_ID || "1250337227582472243"

let __bot_ready      = false
let __discord_client : Client | null = null

/**
 * @description set bot ready status for health checks
 * @param ready - Boolean indicating if bot is ready
 * @returns void
 */
export function set_bot_ready(ready: boolean): void {
  __bot_ready = ready
  if (ready) console.log("[ - SERVER - ] Bot marked as ready for health checks")
}

/**
 * @description start Express HTTP server
 * @param client - Discord client instance
 * @returns void
 */
export function start_webhook_server(client: Client): void {
  __discord_client = client

  const app = express()

  app.set("trust proxy", 1)
  app.disable("x-powered-by")

  app.use(cors({
    origin     : process.env.DASHBOARD_URL || "http://localhost:3000",
    credentials: true,
  }))
  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true, limit: "10mb" }))

  // - Railway 保活机制 - \\
  // - railway keepalive - \\
  app.use((_req, res, next) => {
    res.setHeader("Connection", "keep-alive")
    res.setHeader("Keep-Alive", "timeout=120")
    next()
  })

  // - 挂载路由器 - \\
  // - mount routers - \\
  app.use(create_health_router(() => __bot_ready, client, __port, __public_url))
  app.use(create_webhook_router(client))
  app.use("/api", create_bot_router(client, __main_guild_id))
  app.use("/api", create_user_router(client, __main_guild_id))
  app.use("/api", create_guild_router(client, __main_guild_id))
  app.use("/api", create_settings_router(client, __main_guild_id))
  app.use("/api", create_auto_responder_router(__main_guild_id))
  app.use("/api", create_reaction_roles_router(__main_guild_id))
  app.use("/api", create_custom_commands_router(__main_guild_id))
  app.use("/api", create_logs_router(client, __main_guild_id))

  const server = app.listen(__port, "0.0.0.0", () => {
    console.log(`[ - HTTP - ] Server listening on 0.0.0.0:${__port}`)
    console.log(`[ - HTTP - ] Public URL: ${__public_url}`)
    console.log(`[ - HTTP - ] Health: ${__public_url}/health`)
    console.log(`[ - HTTP - ] Webhook: ${__public_url}/webhook/github`)
  })

  server.on("error", (err: Error) => {
    console.error("[ - HTTP - ] Server error:", err)
    if ((err as any).code === "EADDRINUSE") {
      console.error(`[ - HTTP - ] Port ${__port} is already in use`)
      process.exit(1)
    }
  })
}
