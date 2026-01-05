// - Lorem ipsum dolor sit amet, consectetur adipiscing elit. - \\

/**
 * Pauses execution for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retries an async function with exponential backoff
 * @param {() => Promise<T>} fn - Function to retry
 * @param {number} attempts - Maximum number of attempts
 * @param {number} delay - Delay between attempts in milliseconds
 * @returns {Promise<T>} Result from successful attempt
 */
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

/**
 * Races a promise against a timeout
 * @param {Promise<T>} promise - Promise to race
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Optional timeout error message
 * @returns {Promise<T>} Result or timeout error
 */
export async function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  const timeout_promise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms)
  })

  return Promise.race([promise, timeout_promise])
}

// - Function Rate Limiting - \\
// - Utilities for controlling function execution rates - \\

/**
 * Debounces a function to delay its execution
 * @param {T} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {(...args: Parameters<T>) => void} Debounced function
 */
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

/**
 * Throttles a function to limit execution frequency
 * @param {T} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {(...args: Parameters<T>) => void} Throttled function
 */
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

/**
 * Ensures a function is only called once
 * @param {T} fn - Function to call once
 * @returns {T} Function that can only be called once
 */
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

// - Task Execution Control - \\
// - Functions for controlling async task execution patterns - \\

/**
 * Executes async tasks in parallel with concurrency limit
 * @param {(() => Promise<T>)[]} tasks - Array of async tasks
 * @param {number} concurrency - Maximum concurrent tasks
 * @returns {Promise<T[]>} Array of results
 */
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

/**
 * Executes async tasks sequentially
 * @param {(() => Promise<T>)[]} tasks - Array of async tasks
 * @returns {Promise<T[]>} Array of results in order
 */
export async function sequential<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = []

  for (const task of tasks) {
    results.push(await task())
  }

  return results
}

/**
 * Memoizes a function to cache results
 * @param {T} fn - Function to memoize
 * @returns {T} Memoized function
 */
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

// - Rate Limiting - \\
// - Advanced rate limiting and cooldown mechanisms - \\

/**
 * Creates a rate limiter for controlling request frequency
 * @param {number} limit - Maximum requests allowed
 * @param {number} window_ms - Time window in milliseconds
 * @returns {Object} Rate limiter object with control methods
 */
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

/**
 * Creates a cooldown manager for time-based restrictions
 * @param {number} duration_ms - Cooldown duration in milliseconds
 * @returns {Object} Cooldown manager with control methods
 */
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
