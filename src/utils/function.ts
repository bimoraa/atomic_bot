export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let last = 0
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - last >= limit) {
      last = now
      return fn(...args)
    }
  }) as T
}

export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false
  let result: ReturnType<T>
  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }) as T
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)!
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

export function curry<T extends (...args: any[]) => any>(fn: T) {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn(...args)
    }
    return (...more: any[]) => curried(...args, ...more)
  }
}

export function pipe<T>(...fns: ((arg: T) => T)[]): (arg: T) => T {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg)
}

export function compose<T>(...fns: ((arg: T) => T)[]): (arg: T) => T {
  return (arg: T) => fns.reduceRight((acc, fn) => fn(acc), arg)
}

export function noop(): void {}

export function identity<T>(value: T): T {
  return value
}

export function constant<T>(value: T): () => T {
  return () => value
}

export function times<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i))
}

export function negate<T extends (...args: any[]) => boolean>(fn: T): T {
  return ((...args: Parameters<T>) => !fn(...args)) as T
}

export function partial<T extends (...args: any[]) => any>(fn: T, ...preset: any[]): (...args: any[]) => ReturnType<T> {
  return (...args: any[]) => fn(...preset, ...args)
}

export function flip<T extends (a: any, b: any) => any>(fn: T): (b: Parameters<T>[1], a: Parameters<T>[0]) => ReturnType<T> {
  return (b, a) => fn(a, b)
}

export function tap<T>(value: T, fn: (value: T) => void): T {
  fn(value)
  return value
}

export function attempt<T>(fn: () => T): T | Error {
  try {
    return fn()
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

export async function attempt_async<T>(fn: () => Promise<T>): Promise<T | Error> {
  try {
    return await fn()
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}
