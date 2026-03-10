/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Cache } from "@shared/utils/cache"

const __rate_limit_window_ms = 30_000
const __rate_limit_max       = 20

// - DM ANTI-SPAM: 1 REQUEST PER 2 SECONDS PER USER - \\
const __dm_cooldown_ms = 2_000

type rate_limit_state = {
  count    : number
  reset_at : number
}

type rate_limit_result = {
  allowed   : boolean
  remaining : number
  reset_at  : number
}

const rate_limit_cache = new Cache<rate_limit_state>(
  __rate_limit_window_ms,
  2000,
  60 * 1000,
  "bypass_rate_limit"
)

const dm_cooldown_cache = new Cache<number>(
  __dm_cooldown_ms * 2,
  500,
  __dm_cooldown_ms * 4,
  "bypass_dm_cooldown"
)

export function check_bypass_rate_limit(guild_id: string): rate_limit_result {
  const now = Date.now()
  const key = `bypass_rate:${guild_id}`
  const current = rate_limit_cache.get(key)

  if (!current || current.reset_at <= now) {
    const next = { count: 1, reset_at: now + __rate_limit_window_ms }
    rate_limit_cache.set(key, next, __rate_limit_window_ms)
    return {
      allowed   : true,
      remaining : __rate_limit_max - 1,
      reset_at  : next.reset_at,
    }
  }

  if (current.count >= __rate_limit_max) {
    return {
      allowed   : false,
      remaining : 0,
      reset_at  : current.reset_at,
    }
  }

  const updated = { ...current, count: current.count + 1 }
  const ttl_ms = Math.max(0, current.reset_at - now)
  rate_limit_cache.set(key, updated, ttl_ms)

  return {
    allowed   : true,
    remaining : __rate_limit_max - updated.count,
    reset_at  : current.reset_at,
  }
}

/**
 * Per-user DM cooldown check. Allows 1 request per 2 seconds.
 * @param user_id - Discord user ID
 * @returns { allowed, retry_after_ms } where retry_after_ms is ms until cooldown expires
 */
export function check_dm_user_cooldown(user_id: string): { allowed: boolean; retry_after_ms: number } {
  const now  = Date.now()
  const key  = `dm_cd:${user_id}`
  const last = dm_cooldown_cache.get(key)

  if (last !== undefined && now - last < __dm_cooldown_ms) {
    return { allowed: false, retry_after_ms: __dm_cooldown_ms - (now - last) }
  }

  dm_cooldown_cache.set(key, now, __dm_cooldown_ms)
  return { allowed: true, retry_after_ms: 0 }
}
