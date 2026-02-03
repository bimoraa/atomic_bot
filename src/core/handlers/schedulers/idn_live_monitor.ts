import { Client }                      from "discord.js"
import { logger }                      from "../../../shared/utils"
import { start_live_monitoring }       from "../controllers/idn_live_controller"

const log = logger.create_logger("idn_live_monitor")

/**
 * - START IDN LIVE MONITORING SCHEDULER - \\
 * @param {Client} client - Discord Client instance
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
