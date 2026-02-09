import { Cache } from "@shared/utils/cache"

const RATE_LIMIT_WINDOW_MS = 30_000
const RATE_LIMIT_MAX = 20

type rate_limit_state = {
  count: number
  reset_at: number
}

type rate_limit_result = {
  allowed: boolean
  remaining: number
  reset_at: number
}

const rate_limit_cache = new Cache<rate_limit_state>(
  RATE_LIMIT_WINDOW_MS,
  2000,
  60 * 1000,
  "bypass_rate_limit"
)

export function check_bypass_rate_limit(guild_id: string): rate_limit_result {
  const now = Date.now()
  const key = `bypass_rate:${guild_id}`
  const current = rate_limit_cache.get(key)

  if (!current || current.reset_at <= now) {
    const next = { count: 1, reset_at: now + RATE_LIMIT_WINDOW_MS }
    rate_limit_cache.set(key, next, RATE_LIMIT_WINDOW_MS)
    return {
      allowed   : true,
      remaining : RATE_LIMIT_MAX - 1,
      reset_at  : next.reset_at,
    }
  }

  if (current.count >= RATE_LIMIT_MAX) {
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
    remaining : RATE_LIMIT_MAX - updated.count,
    reset_at  : current.reset_at,
  }
}
