export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let last_error: Error | undefined

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      last_error = error as Error
      if (i < attempts - 1) {
        await sleep(delay)
      }
    }
  }

  throw last_error
}

export async function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  const timeout_promise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms)
  })

  return Promise.race([promise, timeout_promise])
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout_id: NodeJS.Timeout | undefined

  return (...args: Parameters<T>) => {
    if (timeout_id) {
      clearTimeout(timeout_id)
    }
    timeout_id = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let in_throttle = false

  return (...args: Parameters<T>) => {
    if (!in_throttle) {
      fn(...args)
      in_throttle = true
      setTimeout(() => (in_throttle = false), limit)
    }
  }
}

export function once<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let called = false
  let result: ReturnType<T>

  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true
      result = fn(...args) as ReturnType<T>
    }
    return result
  }) as T
}

export async function parallel<T>(tasks: (() => Promise<T>)[], concurrency: number = 5): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

export async function sequential<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = []

  for (const task of tasks) {
    results.push(await task())
  }

  return results
}

export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  }) as T
}

export function create_rate_limiter(limit: number, window_ms: number) {
  const requests = new Map<string, number[]>()

  return {
    is_allowed(key: string): boolean {
      const now = Date.now()
      const timestamps = requests.get(key) || []
      const valid_timestamps = timestamps.filter((t) => now - t < window_ms)

      if (valid_timestamps.length >= limit) {
        return false
      }

      valid_timestamps.push(now)
      requests.set(key, valid_timestamps)
      return true
    },

    remaining(key: string): number {
      const now = Date.now()
      const timestamps = requests.get(key) || []
      const valid_timestamps = timestamps.filter((t) => now - t < window_ms)
      return Math.max(0, limit - valid_timestamps.length)
    },

    reset_time(key: string): number {
      const timestamps = requests.get(key) || []
      if (timestamps.length === 0) return 0
      const oldest = Math.min(...timestamps)
      return Math.max(0, window_ms - (Date.now() - oldest))
    },

    clear(key: string): void {
      requests.delete(key)
    },

    clear_all(): void {
      requests.clear()
    },
  }
}

export function create_cooldown(duration_ms: number) {
  const cooldowns = new Map<string, number>()

  return {
    is_on_cooldown(key: string): boolean {
      const expiry = cooldowns.get(key)
      if (!expiry) return false
      if (Date.now() >= expiry) {
        cooldowns.delete(key)
        return false
      }
      return true
    },

    set_cooldown(key: string): void {
      cooldowns.set(key, Date.now() + duration_ms)
    },

    remaining(key: string): number {
      const expiry = cooldowns.get(key)
      if (!expiry) return 0
      return Math.max(0, expiry - Date.now())
    },

    clear(key: string): void {
      cooldowns.delete(key)
    },

    clear_all(): void {
      cooldowns.clear()
    },
  }
}
