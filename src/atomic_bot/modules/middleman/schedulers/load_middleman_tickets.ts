/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 启动时加载所有中间人票务的定时任务 - \
// - scheduler that loads all active middleman tickets on startup - \
import { Client } from "discord.js"
import { logger } from "@shared/utils"
import { load_active_tickets } from "@shared/database/managers/middleman.manager"
import { load_all_middleman_service_statuses } from "@shared/database/managers/middleman_service.manager"
import { set_user_open_ticket } from "@shared/database/unified_ticket"

const log = logger.create_logger("load_middleman_tickets")

/**
 * @description load all active middleman tickets from database on startup
 * @param {Client} client - discord client
 * @returns {Promise<void>}
 */
export async function load_middleman_tickets_on_startup(client: Client): Promise<void> {
  try {
    // - 加载中间人服务状态 - \\
    // - load middleman service statuses - \\
    await load_all_middleman_service_statuses()

    log.info("Loading active middleman tickets from database")

    const active_tickets = await load_active_tickets()

    if (active_tickets.length === 0) {
      log.info("No active middleman tickets found")
      return
    }

    let loaded_count = 0
    let error_count = 0

    for (const ticket of active_tickets) {
      try {
        // - 验证线程仍存在 - \\
        // - verify thread still exists - \\
        const thread = await client.channels.fetch(ticket.thread_id).catch((err) => {
          if (err.code === 10003 || err.code === 50001 || err.code === 10008) return null // Unknown Channel / Missing Access / Unknown Message
          throw err
        })

        if (thread && thread.isThread() && !thread.locked && !thread.archived) {
          // - 把用户未关闭工单存入内存 - \\
          // - set user open ticket in memory - \\
          set_user_open_ticket("middleman", ticket.requester_id, ticket.thread_id)
          loaded_count++
          log.info(`Loaded ticket ${ticket.ticket_id} for user ${ticket.requester_id}`)
        } else {
          log.warn(`Thread ${ticket.thread_id} for ticket ${ticket.ticket_id} not found or closed`)
          error_count++
        }
      } catch (error) {
        log.error(`Failed to load ticket ${ticket.ticket_id}:`, error)
        error_count++
      }
    }

    log.info(`Loaded ${loaded_count} active middleman tickets (${error_count} errors)`)
  } catch (error) {
    log.error("Failed to load middleman tickets:", error)
  }
}
