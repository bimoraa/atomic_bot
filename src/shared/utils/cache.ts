// - Lorem ipsum dolor sit amet, consectetur adipiscing elit. - \\

/**
 * Cache item with value and expiration time
 */
export type CacheItem<T> = {
  value: T
  expires_at: number | null
}

/**
 * Generic cache class with TTL support
 */
export class Cache<T> {
  private store                 : Map<string, CacheItem<T>> = new Map()
  private default_ttl           : number | null
  private max_size              : number | null
  private cleanup_interval_ms   : number | null
  private cleanup_timer         : NodeJS.Timeout | null     = null
  private pending_requests      : Map<string, Promise<T>>   = new Map()

  /**
   * Creates a new cache instance
   * @param {number | null} default_ttl_ms - Default time-to-live in milliseconds
   */
  constructor(default_ttl_ms: number | null = null, max_size: number | null = null, cleanup_interval_ms: number | null = null) {
    this.default_ttl         = default_ttl_ms
    this.max_size            = max_size
    this.cleanup_interval_ms = cleanup_interval_ms

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
    if (!item) return undefined
    if (item.expires_at && Date.now() > item.expires_at) {
      this.store.delete(key)
      return undefined
    }
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
    this.cleanup_timer       = setInterval(() => this.cleanup(), cleanup_interval_ms)
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
    }
  }
}

// - Global Cache Instance - \\
// - Singleton cache for application-wide use - \\

const global_cache = new Cache<any>(null, 5000, 5 * 60 * 1000)

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
