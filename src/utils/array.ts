export function random_int(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function random_float(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function random_element<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function random_elements<T>(array: T[], count: number): T[] {
  const shuffled = shuffle([...array])
  return shuffled.slice(0, Math.min(count, array.length))
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

export function flatten<T>(array: T[][]): T[] {
  return array.flat()
}

export function group_by<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group_key = String(item[key])
    if (!result[group_key]) {
      result[group_key] = []
    }
    result[group_key].push(item)
    return result
  }, {} as Record<string, T[]>)
}

export function sort_by<T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
  return [...array].sort((a, b) => {
    const a_val = a[key]
    const b_val = b[key]
    if (a_val < b_val) return order === "asc" ? -1 : 1
    if (a_val > b_val) return order === "asc" ? 1 : -1
    return 0
  })
}

export function first<T>(array: T[]): T | undefined {
  return array[0]
}

export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}

export function sum(numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0)
}

export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return sum(numbers) / numbers.length
}

export function min(numbers: number[]): number {
  return Math.min(...numbers)
}

export function max(numbers: number[]): number {
  return Math.max(...numbers)
}

export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

export function repeat<T>(value: T, count: number): T[] {
  return Array(count).fill(value)
}

export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
  const length = Math.min(array1.length, array2.length)
  const result: [T, U][] = []
  for (let i = 0; i < length; i++) {
    result.push([array1[i], array2[i]])
  }
  return result
}

export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2)
  return array1.filter((item) => set2.has(item))
}

export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2)
  return array1.filter((item) => !set2.has(item))
}

export function compact<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item !== null && item !== undefined)
}

export function count<T>(array: T[], predicate: (item: T) => boolean): number {
  return array.filter(predicate).length
}

export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  for (const item of array) {
    if (predicate(item)) {
      pass.push(item)
    } else {
      fail.push(item)
    }
  }
  return [pass, fail]
}
