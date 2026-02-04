import { Client }          from "discord.js"
import { logger }          from "../../../shared/utils"
import { log_error }       from "../../../shared/utils/error_logger"
import * as share_settings from "../shared/controller/share_settings_controller"

const log                      = logger.create_logger("share_settings_forum")
const FORUM_UPDATE_INTERVAL_MS = 15000

/**
 * - UPDATE FORUM POSTS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>} Void
 */
async function update_forum_posts(client: Client): Promise<void> {
  try {
    const records = await share_settings.list_settings_records(client)

    for (const record of records) {
      if (record.thread_id) {
        await share_settings.ensure_thread_active(client, record.thread_id)
      }

      if (!record.forum_thread_id || !record.forum_message_id) continue

      await share_settings.ensure_thread_active(client, record.forum_thread_id)

      await share_settings.update_forum_message(client, record)
    }
  } catch (error) {
    log.error("Error updating forum posts:", error)
    await log_error(client, error as Error, "share_settings_forum_scheduler", {})
  }
}

/**
 * - START SHARE SETTINGS FORUM SCHEDULER - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>} Void
 */
export async function start_share_settings_forum_scheduler(client: Client): Promise<void> {
  log.info("Starting share settings forum updater (15s)")

  setTimeout(() => share_settings.backfill_forum_extras(client), 3000)
  setInterval(() => update_forum_posts(client), FORUM_UPDATE_INTERVAL_MS)
  setTimeout(() => update_forum_posts(client), 5000)
}
