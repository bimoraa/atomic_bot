export type CacheItem<T> = {
  value: T
  expires_at: number | null
}

export class Cache<T> {
  private store: Map<string, CacheItem<T>> = new Map()
  private default_ttl: number | null

  constructor(default_ttl_ms: number | null = null) {
    this.default_ttl = default_ttl_ms
  }

  set(key: string, value: T, ttl_ms: number | null = this.default_ttl): void {
    const expires_at = ttl_ms ? Date.now() + ttl_ms : null
    this.store.set(key, { value, expires_at })
  }

  get(key: string): T | undefined {
    const item = this.store.get(key)
    if (!item) return undefined
    if (item.expires_at && Date.now() > item.expires_at) {
      this.store.delete(key)
      return undefined
    }
    return item.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): boolean {
    return this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    this.cleanup()
    return this.store.size
  }

  keys(): string[] {
    this.cleanup()
    return Array.from(this.store.keys())
  }

  values(): T[] {
    this.cleanup()
    return Array.from(this.store.values()).map((item) => item.value)
  }

  entries(): [string, T][] {
    this.cleanup()
    return Array.from(this.store.entries()).map(([k, v]) => [k, v.value])
  }

  get_or_set(key: string, factory: () => T, ttl_ms?: number): T {
    const existing = this.get(key)
    if (existing !== undefined) return existing
    const value = factory()
    this.set(key, value, ttl_ms)
    return value
  }

  async get_or_set_async(key: string, factory: () => Promise<T>, ttl_ms?: number): Promise<T> {
    const existing = this.get(key)
    if (existing !== undefined) return existing
    const value = await factory()
    this.set(key, value, ttl_ms)
    return value
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.store) {
      if (item.expires_at && now > item.expires_at) {
        this.store.delete(key)
      }
    }
  }

  ttl(key: string): number | null {
    const item = this.store.get(key)
    if (!item || !item.expires_at) return null
    const remaining = item.expires_at - Date.now()
    return remaining > 0 ? remaining : null
  }

  extend(key: string, ttl_ms: number): boolean {
    const item = this.store.get(key)
    if (!item) return false
    item.expires_at = Date.now() + ttl_ms
    return true
  }
}

const global_cache = new Cache<any>()

export function set<T>(key: string, value: T, ttl_ms?: number): void {
  global_cache.set(key, value, ttl_ms)
}

export function get<T>(key: string): T | undefined {
  return global_cache.get(key)
}

export function has(key: string): boolean {
  return global_cache.has(key)
}

export function remove(key: string): boolean {
  return global_cache.delete(key)
}

export function clear(): void {
  global_cache.clear()
}

export function get_or_set<T>(key: string, factory: () => T, ttl_ms?: number): T {
  return global_cache.get_or_set(key, factory, ttl_ms)
}

export async function get_or_set_async<T>(key: string, factory: () => Promise<T>, ttl_ms?: number): Promise<T> {
  return global_cache.get_or_set_async(key, factory, ttl_ms)
}
