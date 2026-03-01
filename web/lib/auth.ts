const __manage_guild_bit = BigInt(0x20)
const __admin_bit        = BigInt(0x8)

// - IN-MEMORY CACHE: key = `${token}:${guild_id}`, ttl = 60s - \\
const __cache     = new Map<string, { result: boolean; expires: number }>()
// - IN-FLIGHT DEDUP: prevents parallel identical fetches hitting Discord - \\
const __in_flight = new Map<string, Promise<boolean>>()

/**
 * Verify that the Discord user (identified by access_token) has ManageGuild
 * in the specified guild. Results are cached for 60 seconds. Concurrent
 * identical calls are coalesced into one fetch to avoid rate limiting.
 *
 * @param access_token - Discord OAuth2 access token from cookie
 * @param guild_id     - Target guild ID
 * @returns Whether the user has ManageGuild (or Administrator) permission
 */
export async function verify_manage_guild(
  access_token : string,
  guild_id     : string
): Promise<boolean> {
  const key  = `${access_token}:${guild_id}`
  const now  = Date.now()

  // - CACHE HIT - \\
  const cached = __cache.get(key)
  if (cached && cached.expires > now) return cached.result

  // - COALESCE CONCURRENT REQUESTS - \\
  const existing = __in_flight.get(key)
  if (existing) return existing

  // - evict expired entries periodically - \\
  if (__cache.size > 500) {
    for (const [k, v] of __cache) {
      if (v.expires <= now) __cache.delete(k)
    }
  }

  const promise = _fetch_guild_permission(access_token, guild_id, key)
  __in_flight.set(key, promise)

  try {
    return await promise
  } finally {
    __in_flight.delete(key)
  }
}

async function _fetch_guild_permission(
  access_token : string,
  guild_id     : string,
  cache_key    : string
): Promise<boolean> {
  const now = Date.now()

  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers : { Authorization: `Bearer ${access_token}` },
      cache   : 'no-store',
    })

    if (response.status === 429) {
      // - rate limited: cache true for 60s to avoid further hammering - \\
      const retry_after = Number(response.headers.get('retry-after') ?? 60) * 1000
      console.warn(`[ - AUTH - ] Discord rate limited on /users/@me/guilds — backing off ${retry_after}ms`)
      __cache.set(cache_key, { result: true, expires: now + Math.max(retry_after, 60_000) })
      return true
    }

    if (!response.ok) {
      console.error('[ - AUTH - ] Discord guilds error:', response.status)
      __cache.set(cache_key, { result: false, expires: now + 30_000 })
      return false
    }

    const guilds: Array<{ id: string; permissions: string }> = await response.json()
    const guild  = guilds.find(g => g.id === guild_id)

    if (!guild) {
      __cache.set(cache_key, { result: false, expires: now + 60_000 })
      return false
    }

    const perms  = BigInt(guild.permissions)
    const result = (perms & __manage_guild_bit) !== BigInt(0)
                || (perms & __admin_bit)        !== BigInt(0)

    __cache.set(cache_key, { result, expires: now + 60_000 })
    return result
  } catch (err) {
    console.error('[ - AUTH - ] verify_manage_guild error:', err)
    return false
  }
}
