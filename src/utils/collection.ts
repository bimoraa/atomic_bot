export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function flatten<T>(arr: T[][]): T[] {
  return arr.flat()
}

export function deep_flatten<T>(arr: any[]): T[] {
  return arr.flat(Infinity) as T[]
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export function group_by<T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] = acc[k] || []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export function count_by<T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<K, number>)
}

export function sort_by<T>(arr: T[], key: (item: T) => number | string, desc: boolean = false): T[] {
  return [...arr].sort((a, b) => {
    const va = key(a)
    const vb = key(b)
    if (va < vb) return desc ? 1 : -1
    if (va > vb) return desc ? -1 : 1
    return 0
  })
}

export function find_by<T, K extends keyof T>(arr: T[], key: K, value: T[K]): T | undefined {
  return arr.find((item) => item[key] === value)
}

export function filter_by<T, K extends keyof T>(arr: T[], key: K, value: T[K]): T[] {
  return arr.filter((item) => item[key] === value)
}

export function remove<T>(arr: T[], item: T): T[] {
  return arr.filter((i) => i !== item)
}

export function remove_at<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1)]
}

export function insert_at<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index)]
}

export function replace_at<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index + 1)]
}

export function swap<T>(arr: T[], i: number, j: number): T[] {
  const result = [...arr]
  ;[result[i], result[j]] = [result[j], result[i]]
  return result
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

export function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1]
}

export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n)
}

export function take_last<T>(arr: T[], n: number): T[] {
  return arr.slice(-n)
}

export function drop<T>(arr: T[], n: number): T[] {
  return arr.slice(n)
}

export function drop_last<T>(arr: T[], n: number): T[] {
  return arr.slice(0, -n)
}

export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

export function zip<T, U>(a: T[], b: U[]): [T, U][] {
  const len = Math.min(a.length, b.length)
  const result: [T, U][] = []
  for (let i = 0; i < len; i++) {
    result.push([a[i], b[i]])
  }
  return result
}

export function unzip<T, U>(arr: [T, U][]): [T[], U[]] {
  const a: T[] = []
  const b: U[] = []
  for (const [t, u] of arr) {
    a.push(t)
    b.push(u)
  }
  return [a, b]
}

export function intersection<T>(a: T[], b: T[]): T[] {
  const set = new Set(b)
  return a.filter((item) => set.has(item))
}

export function difference<T>(a: T[], b: T[]): T[] {
  const set = new Set(b)
  return a.filter((item) => !set.has(item))
}

export function union<T>(a: T[], b: T[]): T[] {
  return unique([...a, ...b])
}

export function is_equal<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

export function is_subset<T>(subset: T[], superset: T[]): boolean {
  const set = new Set(superset)
  return subset.every((item) => set.has(item))
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

export function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return sum(arr) / arr.length
}

export function min(arr: number[]): number {
  return Math.min(...arr)
}

export function max(arr: number[]): number {
  return Math.max(...arr)
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
