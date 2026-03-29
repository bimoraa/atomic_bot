/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client }                      from "discord.js"
import { logger }                      from "@shared/utils"
import { start_live_monitoring }       from "@jkt48/modules/live_notify/controllers/idn_live.controller"

const log = logger.create_logger("idn_live_monitor")

/**
 * - 启动 IDN 直播监控调度器 - \\
 * - start idn live monitoring scheduler - \\
 * @param {Client} client - discord Client instance
 * @returns {Promise<void>}
 */
export async function start_idn_live_scheduler(client: Client): Promise<void> {
  log.info("Starting JKT48 IDN + Showroom live monitoring scheduler")

  try {
    start_live_monitoring(client, 60000)

    log.info("Live monitoring started successfully (checking every 60s)")
  } catch (error) {
    log.error("Failed to start live monitoring:", error)
  }
}
