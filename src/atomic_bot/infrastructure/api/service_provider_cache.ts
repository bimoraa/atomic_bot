import { Client } from "discord.js"
import { db } from "@shared/utils"
import { log_error } from "@shared/utils/error_logger"
import * as luarmor from "./luarmor"

const CACHE_INTERVAL_MS       = 30 * 60 * 1000
const MIN_SYNC_INTERVAL_MS    = 15 * 60 * 1000
const MAX_CONSECUTIVE_ERRORS  = 3

let is_syncing                = false
let sync_interval             : NodeJS.Timeout | null = null
let last_sync_time            = 0
let consecutive_errors        = 0

/**
 * @param {Client} client - Discord client instance
 * @return {Promise<void>} Resolve when sync completes
 */
export async function sync_service_provider_cache(client: Client): Promise<void> {
  // - PREVENT CONCURRENT SYNCS - \\
  if (is_syncing) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Sync already in progress, skipping")
    return
  }

  // - PREVENT TOO FREQUENT SYNCS - \\
  const now = Date.now()
  if (now - last_sync_time < MIN_SYNC_INTERVAL_MS) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Sync too recent, skipping")
    return
  }

  // - CHECK CIRCUIT BREAKER STATUS - \\
  const circuit_status = luarmor.get_circuit_status()
  if (circuit_status.open) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Circuit breaker open, skipping sync")
    return
  }

  // - PAUSE ON CONSECUTIVE ERRORS - \\
  if (consecutive_errors >= MAX_CONSECUTIVE_ERRORS) {
    const pause_until = last_sync_time + (consecutive_errors * CACHE_INTERVAL_MS)
    if (now < pause_until) {
      console.log(`[ - SERVICE PROVIDER CACHE - ] Paused due to ${consecutive_errors} consecutive errors`)
      return
    }
    consecutive_errors = 0
  }

  is_syncing     = true
  last_sync_time = now
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
      consecutive_errors++
      try {
        await log_error(client, new Error(users_result.error || "Failed to fetch users"), "service_provider_cache_fetch", {
          consecutive_errors: consecutive_errors,
        })
      } catch (log_err) {
        console.error("[ - SERVICE PROVIDER CACHE - ] Failed to log error:", log_err)
      }
      return
    }

    // - RESET CONSECUTIVE ERRORS ON SUCCESS - \\
    consecutive_errors = 0

    console.log(`[ - SERVICE PROVIDER CACHE - ] Fetched ${users_result.data.length} users from Luarmor`)

    let cached_users    = 0
    let failed_users    = 0

    // - BATCH UPDATE WITH RATE LIMITING - \\
    const batch_size = 50
    for (let i = 0; i < users_result.data.length; i += batch_size) {
      const batch = users_result.data.slice(i, i + batch_size)
      
      await Promise.all(batch.map(async (user) => {
        const user_id = user.discord_id || user.user_key
        if (!user_id) {
          return
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
        }
      }))
      
      // - SMALL DELAY BETWEEN BATCHES - \\
      if (i + batch_size < users_result.data.length) {
        await new Promise(r => setTimeout(r, 100))
      }
    }

    console.log(`[ - SERVICE PROVIDER CACHE - ] Sync complete: ${cached_users} cached, ${failed_users} failed at ${new Date(now).toISOString()}`)
  } catch (error) {
    console.error("[ - SERVICE PROVIDER CACHE - ] Sync error:", error)
    consecutive_errors++
    try {
      await log_error(client, error as Error, "service_provider_cache_sync", {
        consecutive_errors: consecutive_errors,
      })
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
  sync_interval = setInterval(run_sync, CACHE_INTERVAL_MS)

  console.log("[ - SERVICE PROVIDER CACHE - ] Scheduler started (30 minutes)")
}

/**
 * @return {void}
 */
export function stop_service_provider_cache(): void {
  if (sync_interval) {
    clearInterval(sync_interval)
    sync_interval = null
    console.log("[ - SERVICE PROVIDER CACHE - ] Scheduler stopped")
  }
}
