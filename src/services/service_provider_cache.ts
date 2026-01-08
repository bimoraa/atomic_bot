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
  if (is_syncing) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Sync already in progress, skipping")
    return
  }

  is_syncing = true
  console.log("[ - SERVICE PROVIDER CACHE - ] Starting sync...")

  try {
    if (!db.is_connected()) {
      console.error("[ - SERVICE PROVIDER CACHE - ] Database not connected, skipping sync")
      is_syncing = false
      return
    }

    const users_result = await luarmor.get_all_users()

    if (!users_result.success || !users_result.data) {
      console.error("[ - SERVICE PROVIDER CACHE - ] Failed to fetch users from Luarmor:", users_result.error)
      try {
        await log_error(client, new Error(users_result.error || "Failed to fetch users"), "service_provider_cache_fetch", {})
      } catch (log_err) {
        console.error("[ - SERVICE PROVIDER CACHE - ] Failed to log error:", log_err)
      }
      return
    }

    console.log(`[ - SERVICE PROVIDER CACHE - ] Fetched ${users_result.data.length} users from Luarmor`)

    const now           = Date.now()
    let cached_users    = 0
    let failed_users    = 0

    for (const user of users_result.data) {
      const user_id = user.discord_id || user.user_key
      if (!user_id) {
        console.warn("[ - SERVICE PROVIDER CACHE - ] User missing both discord_id and user_key, skipping")
        continue
      }

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
        failed_users += 1
        console.error(`[ - SERVICE PROVIDER CACHE - ] Failed to cache user ${user_id}:`, error)
        try {
          await log_error(client, error as Error, "service_provider_cache_update", { user_id })
        } catch (log_err) {
          console.error("[ - SERVICE PROVIDER CACHE - ] Failed to log error:", log_err)
        }
      }
    }

    console.log(`[ - SERVICE PROVIDER CACHE - ] Sync complete: ${cached_users} cached, ${failed_users} failed at ${new Date(now).toISOString()}`)
  } catch (error) {
    console.error("[ - SERVICE PROVIDER CACHE - ] Sync error:", error)
    try {
      await log_error(client, error as Error, "service_provider_cache_sync", {})
    } catch (log_err) {
      console.error("[ - SERVICE PROVIDER CACHE - ] Failed to log error:", log_err)
    }
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
