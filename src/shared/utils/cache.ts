// - CACHE UTILITY WITH STATISTICS AND PERFORMANCE TRACKING - \\

/**
 * Cache item with value and expiration time
 */
export type CacheItem<T> = {
  value: T
  expires_at: number | null
}

/**
 * Cache statistics for monitoring performance
 */
export type cache_stats = {
  hits: number
  misses: number
  evictions: number
  size: number
  hit_rate: number
}

/**
 * Generic cache class with TTL support and statistics tracking
 */
export class Cache<T> {
  private store: Map<string, CacheItem<T>> = new Map()
  private default_ttl: number | null
  private max_size: number | null
  private cleanup_interval_ms: number | null
  private cleanup_timer: NodeJS.Timeout | null = null
  private pending_requests: Map<string, Promise<T>> = new Map()
  private stats = { hits: 0, misses: 0, evictions: 0 }
  private namespace: string

  /**
   * Creates a new cache instance
   * @param {number | null} default_ttl_ms - Default time-to-live in milliseconds
   * @param {number | null} max_size - Maximum cache size
   * @param {number | null} cleanup_interval_ms - Cleanup interval in milliseconds
   * @param {string} namespace - Cache namespace for organization
   */
  constructor(default_ttl_ms: number | null = null, max_size: number | null = null, cleanup_interval_ms: number | null = null, namespace: string = 'default') {
    this.default_ttl = default_ttl_ms
    this.max_size = max_size
    this.cleanup_interval_ms = cleanup_interval_ms
    this.namespace = namespace

    if (this.cleanup_interval_ms && this.cleanup_interval_ms > 0) {
      this.start_cleanup_interval(this.cleanup_interval_ms)
    }
  }

  /**
   * Stores a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number | null} ttl_ms - Time-to-live in milliseconds
   * @returns {void}
   */
  set(key: string, value: T, ttl_ms: number | null = this.default_ttl): void {
    const expires_at = ttl_ms ? Date.now() + ttl_ms : null
    if (this.store.has(key)) {
      this.store.delete(key)
    }
    this.store.set(key, { value, expires_at })
    this.enforce_limit()
  }

  /**
   * Retrieves a value from cache
   * @param {string} key - Cache key
   * @returns {T | undefined} Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const item = this.store.get(key)
    if (!item) {
      this.stats.misses++
      return undefined
    }
    if (item.expires_at && Date.now() > item.expires_at) {
      this.store.delete(key)
      this.stats.misses++
      return undefined
    }
    this.stats.hits++
    this.store.delete(key)
    this.store.set(key, item)
    return item.value
  }

  /**
   * Checks if a key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Deletes a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Clears all cache entries
   * @returns {void}
   */
  clear(): void {
    this.store.clear()
    this.pending_requests.clear()
  }

  /**
   * Returns the number of non-expired cache entries
   * @returns {number} Number of entries
   */
  size(): number {
    this.cleanup()
    return this.store.size
  }

  /**
   * Returns all cache keys
   * @returns {string[]} Array of keys
   */
  keys(): string[] {
    this.cleanup()
    return Array.from(this.store.keys())
  }

  /**
   * Returns all cache values
   * @returns {T[]} Array of values
   */
  values(): T[] {
    this.cleanup()
    return Array.from(this.store.values()).map((item) => item.value)
  }

  /**
   * Returns all cache entries as key-value pairs
   * @returns {[string, T][]} Array of [key, value] tuples
   */
  entries(): [string, T][] {
    this.cleanup()
    return Array.from(this.store.entries()).map(([k, v]) => [k, v.value])
  }

  /**
   * Gets a value or sets it using factory if not found
   * @param {string} key - Cache key
   * @param {() => T} factory - Function to create value if not cached
   * @param {number} ttl_ms - Optional TTL override
   * @returns {T} Cached or newly created value
   */
  get_or_set(key: string, factory: () => T, ttl_ms?: number): T {
    const existing = this.get(key)
    if (existing !== undefined) return existing
    const value = factory()
    this.set(key, value, ttl_ms)
    return value
  }

  /**
   * Async version of get_or_set
   * @param {string} key - Cache key
   * @param {() => Promise<T>} factory - Async function to create value
   * @param {number} ttl_ms - Optional TTL override
   * @returns {Promise<T>} Cached or newly created value
   */
  async get_or_set_async(key: string, factory: () => Promise<T>, ttl_ms?: number): Promise<T> {
    const existing = this.get(key)
    if (existing !== undefined) return existing
    const pending = this.pending_requests.get(key)
    if (pending) return pending

    const request = (async () => {
      const value = await factory()
      this.set(key, value, ttl_ms)
      return value
    })()

    this.pending_requests.set(key, request)

    try {
      return await request
    } finally {
      this.pending_requests.delete(key)
    }
  }

  /**
   * Removes expired entries from cache
   * @returns {void}
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.store) {
      if (item.expires_at && now > item.expires_at) {
        this.store.delete(key)
      }
    }
    this.enforce_limit()
  }

  /**
   * Gets remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {number | null} Remaining milliseconds or null
   */
  ttl(key: string): number | null {
    const item = this.store.get(key)
    if (!item || !item.expires_at) return null
    const remaining = item.expires_at - Date.now()
    return remaining > 0 ? remaining : null
  }

  /**
   * Extends the TTL of an existing key
   * @param {string} key - Cache key
   * @param {number} ttl_ms - New TTL in milliseconds
   * @returns {boolean} True if key was extended
   */
  extend(key: string, ttl_ms: number): boolean {
    const item = this.store.get(key)
    if (!item) return false
    item.expires_at = Date.now() + ttl_ms
    return true
  }

  /**
   * - START AUTO CLEANUP INTERVAL - \\
   * @param cleanup_interval_ms Cleanup interval in milliseconds
   * @returns {void}
   */
  start_cleanup_interval(cleanup_interval_ms: number): void {
    this.stop_cleanup_interval()
    this.cleanup_interval_ms = cleanup_interval_ms
    this.cleanup_timer = setInterval(() => this.cleanup(), cleanup_interval_ms)
  }

  /**
   * - STOP AUTO CLEANUP INTERVAL - \\
   * @returns {void}
   */
  stop_cleanup_interval(): void {
    if (this.cleanup_timer) {
      clearInterval(this.cleanup_timer)
      this.cleanup_timer = null
    }
  }

  /**
   * - ENFORCE CACHE SIZE LIMIT - \\
   * @returns {void}
   */
  private enforce_limit(): void {
    if (!this.max_size || this.max_size <= 0) return

    while (this.store.size > this.max_size) {
      const oldest_key = this.store.keys().next().value
      if (!oldest_key) break
      this.store.delete(oldest_key)
      this.stats.evictions++
    }
  }

  /**
   * - GET CACHE STATISTICS - \\
   * @returns {cache_stats} Cache statistics
   */
  get_stats(): cache_stats {
    const total = this.stats.hits + this.stats.misses
    const hit_rate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.store.size,
      hit_rate: parseFloat(hit_rate.toFixed(2)),
    }
  }

  /**
   * - RESET CACHE STATISTICS - \\
   * @returns {void}
   */
  reset_stats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  /**
   * - LOG CACHE STATISTICS - \\
   * @returns {void}
   */
  log_stats(): void {
    const stats = this.get_stats()
    console.log(`[ - CACHE STATS (${this.namespace}) - ] Hits: ${stats.hits} | Misses: ${stats.misses} | Evictions: ${stats.evictions} | Size: ${stats.size} | Hit Rate: ${stats.hit_rate}%`)
  }

  /**
   * - GET MULTIPLE VALUES - \\
   * @param {string[]} keys - Cache keys
   * @returns {Map<string, T>} Map of found values
   */
  get_many(keys: string[]): Map<string, T> {
    const result = new Map<string, T>()
    for (const key of keys) {
      const value = this.get(key)
      if (value !== undefined) {
        result.set(key, value)
      }
    }
    return result
  }

  /**
   * - SET MULTIPLE VALUES - \\
   * @param {Map<string, T>} entries - Map of key-value pairs
   * @param {number} ttl_ms - Optional TTL override
   * @returns {void}
   */
  set_many(entries: Map<string, T>, ttl_ms?: number): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl_ms)
    }
  }

  /**
   * - GET CACHE NAMESPACE - \\
   * @returns {string} Cache namespace
   */
  get_namespace(): string {
    return this.namespace
  }
}

// - SPECIALIZED CACHE INSTANCES - \\
// - Organized by feature for better performance monitoring - \\

const global_cache = new Cache<any>(null, 5000, 5 * 60 * 1000, 'global')
export const guild_cache = new Cache<any>(5 * 60 * 1000, 1000, 5 * 60 * 1000, 'guild')
export const user_cache = new Cache<any>(10 * 60 * 1000, 2000, 5 * 60 * 1000, 'user')
export const db_cache = new Cache<any>(3 * 60 * 1000, 3000, 5 * 60 * 1000, 'database')

/**
 * Sets a value in the global cache
 * @param {string} key - Cache key
 * @param {T} value - Value to cache
 * @param {number} ttl_ms - Optional TTL in milliseconds
 * @returns {void}
 */
export function set<T>(key: string, value: T, ttl_ms?: number): void {
  global_cache.set(key, value, ttl_ms)
}

/**
 * Gets a value from the global cache
 * @param {string} key - Cache key
 * @returns {T | undefined} Cached value or undefined
 */
export function get<T>(key: string): T | undefined {
  return global_cache.get(key)
}

/**
 * Checks if a key exists in the global cache
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists
 */
export function has(key: string): boolean {
  return global_cache.has(key)
}

/**
 * Removes a key from the global cache
 * @param {string} key - Cache key
 * @returns {boolean} True if key was removed
 */
export function remove(key: string): boolean {
  return global_cache.delete(key)
}

/**
 * Clears the global cache
 * @returns {void}
 */
export function clear(): void {
  global_cache.clear()
}

/**
 * Gets a value from global cache or sets it using factory
 * @param {string} key - Cache key
 * @param {() => T} factory - Function to create value if not cached
 * @param {number} ttl_ms - Optional TTL in milliseconds
 * @returns {T} Cached or newly created value
 */
export function get_or_set<T>(key: string, factory: () => T, ttl_ms?: number): T {
  return global_cache.get_or_set(key, factory, ttl_ms)
}

/**
 * Async version of get_or_set for global cache
 * @param {string} key - Cache key
 * @param {() => Promise<T>} factory - Async function to create value
 * @param {number} ttl_ms - Optional TTL in milliseconds
 * @returns {Promise<T>} Cached or newly created value
 */
export async function get_or_set_async<T>(key: string, factory: () => Promise<T>, ttl_ms?: number): Promise<T> {
  return global_cache.get_or_set_async(key, factory, ttl_ms)
}

/**
 * - LOG ALL CACHE STATISTICS - \\
 * @returns {void}
 */
export function log_all_cache_stats(): void {
  console.log('[ - CACHE STATS - ] =================================')
  global_cache.log_stats()
  guild_cache.log_stats()
  user_cache.log_stats()
  db_cache.log_stats()
  console.log('[ - CACHE STATS - ] =================================')
}

/**
 * - GET ALL CACHE STATISTICS - \\
 * @returns {Record<string, cache_stats>} All cache statistics
 */
export function get_all_cache_stats(): Record<string, cache_stats> {
  return {
    global: global_cache.get_stats(),
    guild: guild_cache.get_stats(),
    user: user_cache.get_stats(),
    database: db_cache.get_stats(),
  }
}
