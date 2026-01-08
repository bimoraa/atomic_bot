import { Client } from "discord.js"
import { db } from "../utils"
import { log_error } from "../utils/error_logger"
import * as luarmor from "./luarmor"

const CACHE_INTERVAL_MS = 3 * 60 * 1000

let is_syncing = false

/**
 * @param {Client} client - Discord client instance
 * @return {Promise<void>} Resolve when sync completes
 */
export async function sync_service_provider_cache(client: Client): Promise<void> {
  if (is_syncing) return

  is_syncing = true

  try {
    const users_result = await luarmor.get_all_users()

    if (!users_result.success || !users_result.data) {
      await log_error(client, new Error(users_result.error || "Failed to fetch users"), "service_provider_cache_fetch", {})
      return
    }

    const now           = Date.now()
    let cached_users    = 0

    for (const user of users_result.data) {
      const user_id = user.discord_id || user.user_key
      if (!user_id) continue

      try {
        await db.update_one(
          "service_provider_user_cache",
          { user_id },
          {
            user_id,
            user_data    : user,
            cached_at    : now,
            last_updated : now,
          },
          true
        )
        cached_users += 1
      } catch (error) {
        await log_error(client, error as Error, "service_provider_cache_update", { user_id })
      }
    }

    console.log(`[ - SERVICE PROVIDER CACHE - ] Cached ${cached_users} users at ${new Date(now).toISOString()}`)
  } catch (error) {
    await log_error(client, error as Error, "service_provider_cache_sync", {})
  } finally {
    is_syncing = false
  }
}

/**
 * @param {Client} client - Discord client instance
 * @return {void}
 */
export function start_service_provider_cache(client: Client): void {
  const run_sync = async () => {
    await sync_service_provider_cache(client)
  }

  void run_sync()
  setInterval(run_sync, CACHE_INTERVAL_MS)

  console.log("[ - SERVICE PROVIDER CACHE - ] Scheduler started (3 minutes)")
}
