/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 服务提供商缓存层 - \
// - service provider cache layer - \
import { Client } from "discord.js"
import { db } from "@utils"
import { log_error } from "@utils/error_logger"
import * as luarmor from "./luarmor"

const CACHE_INTERVAL_MS       = 30 * 60 * 1000
const MIN_SYNC_INTERVAL_MS    = 15 * 60 * 1000
const MAX_CONSECUTIVE_ERRORS  = 3

let is_syncing                = false
let sync_interval             : NodeJS.Timeout | null = null
let last_sync_time            = 0
let consecutive_errors        = 0

/**
 * @param {Client} client - discord client instance
 * @return {Promise<void>} Resolve when sync completes
 */
export async function sync_service_provider_cache(client: Client): Promise<void> {
  // - 防止并发同步 - \\
  // - prevent concurrent syncs - \\
  if (is_syncing) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Sync already in progress, skipping")
    return
  }

  // - 防止过于频繁的同步 - \\
  // - prevent too frequent syncs - \\
  const now = Date.now()
  if (now - last_sync_time < MIN_SYNC_INTERVAL_MS) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Sync too recent, skipping")
    return
  }

  // - 检查熟断器状态 - \\
  // - check circuit breaker status - \\
  const circuit_status = luarmor.get_circuit_status()
  if (circuit_status.open) {
    console.log("[ - SERVICE PROVIDER CACHE - ] Circuit breaker open, skipping sync")
    return
  }

  // - 连续错误时暂停 - \\
  // - pause on consecutive errors - \\
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

    // - 成功时重置连续错误计数 - \\
    // - reset consecutive errors on success - \\
    consecutive_errors = 0

    console.log(`[ - SERVICE PROVIDER CACHE - ] Fetched ${users_result.data.length} users from Luarmor`)

    let cached_users    = 0
    let failed_users    = 0

    // - 分批限速更新 - \\
    // - batch update with rate limiting - \\
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
      
      // - 批次间小延迟 - \\
      // - small delay between batches - \\
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
 * @param {Client} client - discord client instance
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
