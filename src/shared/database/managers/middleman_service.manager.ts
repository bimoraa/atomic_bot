/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { db } from "../../utils"

const __collection = "middleman_service_status"

export interface MiddlemanServiceStatus {
  guild_id  : string
  is_open   : boolean
  updated_at: number
  updated_by: string
}

let cached_status: Map<string, boolean> = new Map()

/**
 * @description get middleman service status for a guild
 * @param {string} guild_id - guild ID
 * @returns {Promise<boolean>} - True if service is open, false if closed
 */
export async function is_middleman_service_open(guild_id: string): Promise<boolean> {
  // - 先检查缓存 - \\
  // - check cache first - \\
  if (cached_status.has(guild_id)) {
    return cached_status.get(guild_id)!
  }

  // - 从数据库加载 - \\
  // - load from database - \\
  if (!db.is_connected()) {
    // - 数据库不可用时默认开放 - \\
    // - default to open if db not available - \\
    return true
  }

  try {
    const status = await db.find_one<MiddlemanServiceStatus>(__collection, { guild_id })
    const is_open = status ? status.is_open : true
    cached_status.set(guild_id, is_open)
    return is_open
  } catch (error) {
    console.error(`[ - MIDDLEMAN SERVICE - ] Failed to get status:`, error)
    return true
  }
}

/**
 * @description set middleman service status
 * @param {string} guild_id - guild ID
 * @param {boolean} is_open - true to open service, false to close
 * @param {string} updated_by - user ID who updated the status
 * @returns {Promise<boolean>} - Success status
 */
export async function set_middleman_service_status(guild_id: string, is_open: boolean, updated_by: string): Promise<boolean> {
  if (!db.is_connected()) return false

  try {
    const timestamp = Math.floor(Date.now() / 1000)

    await db.update_one(
      __collection,
      { guild_id },
      {
        is_open,
        updated_at: timestamp,
        updated_by,
      },
      true
    )

    // - 更新缓存 - \\
    // - update cache - \\
    cached_status.set(guild_id, is_open)

    console.log(`[ - MIDDLEMAN SERVICE - ] Status updated: ${is_open ? "OPEN" : "CLOSED"} for guild ${guild_id}`)
    return true
  } catch (error) {
    console.error(`[ - MIDDLEMAN SERVICE - ] Failed to set status:`, error)
    return false
  }
}

/**
 * @description load all middleman service statuses into cache on startup
 * @returns {Promise<void>}
 */
export async function load_all_middleman_service_statuses(): Promise<void> {
  if (!db.is_connected()) return

  try {
    const statuses = await db.find_many<MiddlemanServiceStatus>(__collection, {})

    for (const status of statuses) {
      cached_status.set(status.guild_id, status.is_open)
    }

    console.log(`[ - MIDDLEMAN SERVICE - ] Loaded ${statuses.length} service statuses`)
  } catch (error) {
    console.error(`[ - MIDDLEMAN SERVICE - ] Failed to load statuses:`, error)
  }
}

/**
 * @description clear cache (for testing purposes)
 * @returns {void}
 */
export function clear_middleman_service_cache(): void {
  cached_status.clear()
}
