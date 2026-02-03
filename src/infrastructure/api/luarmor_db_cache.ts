/**
 * - LUARMOR DATABASE CACHE LAYER - \\
 * PostgreSQL caching for Luarmor user data to reduce API calls
 */

import { db } from "../../shared/utils"
import type { luarmor_user } from "./luarmor"

const USER_CACHE_COLLECTION = "service_provider_user_cache"
const CACHE_DURATION_MS     = 4 * 60 * 60 * 1000
const STALE_DURATION_MS     = 24 * 60 * 60 * 1000

interface cached_user_record {
  _id?         : any
  user_id      : string
  user_data    : luarmor_user
  cached_at    : number
  last_updated : number
}

/**
 * - CHECK UNIQUE VIOLATION ERROR - \\
 * @param {unknown} error - Error object
 * @returns {boolean} True if unique constraint violation
 */
function is_unique_violation(error: unknown): boolean {
  const err = error as { code?: string } | null
  return err?.code === "23505"
}

/**
 * - GET USER FROM DATABASE CACHE - \\
 * @param discord_id Discord ID
 * @param allow_stale Allow stale data if fresh data unavailable
 * @returns Cached user data or null
 */
export async function get_cached_user_from_db(discord_id: string, allow_stale: boolean = false): Promise<luarmor_user | null> {
  try {
    if (!db.is_connected()) {
      return null
    }

    const cached = await db.find_one<cached_user_record>(USER_CACHE_COLLECTION, { user_id: discord_id })
    
    if (!cached) {
      return null
    }
    
    const now       = Date.now()
    const cache_age = now - cached.cached_at
    
    // - RETURN FRESH CACHE - \\
    if (cache_age <= CACHE_DURATION_MS) {
      return cached.user_data
    }
    
    // - RETURN STALE CACHE IF ALLOWED - \\
    if (allow_stale && cache_age <= STALE_DURATION_MS) {
      console.log("[ - DB CACHE - ] Returning stale cache for:", discord_id)
      return cached.user_data
    }
    
    return null
  } catch (error) {
    console.error("[ - DB CACHE - ] Error reading cache:", error)
    return null
  }
}

/**
 * - SAVE USER TO DATABASE CACHE - \\
 * @param discord_id Discord ID
 * @param user_data User data
 */
export async function save_user_to_db_cache(discord_id: string, user_data: luarmor_user): Promise<void> {
  try {
    if (!db.is_connected()) {
      return
    }

    const now = Date.now()
    try {
      await db.update_one<cached_user_record>(
        USER_CACHE_COLLECTION,
        { user_id: discord_id },
        {
          user_id      : discord_id,
          user_data    : user_data,
          cached_at    : now,
          last_updated : now,
        },
        true
      )
    } catch (error) {
      if (is_unique_violation(error)) {
        await db.update_one<cached_user_record>(
          USER_CACHE_COLLECTION,
          { user_id: discord_id },
          {
            user_data    : user_data,
            cached_at    : now,
            last_updated : now,
          },
          false
        )
        return
      }

      throw error
    }
  } catch (error) {
    console.error("[ - DB CACHE - ] Error saving cache:", error)
  }
}

/**
 * - DELETE USER FROM DATABASE CACHE - \\
 * @param discord_id Discord ID
 */
export async function delete_user_from_db_cache(discord_id: string): Promise<void> {
  try {
    if (!db.is_connected()) {
      return
    }

    await db.delete_one(USER_CACHE_COLLECTION, { user_id: discord_id })
  } catch (error) {
    console.error("[ - DB CACHE - ] Error deleting cache:", error)
  }
}
