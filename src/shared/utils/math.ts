export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

export function map_range(value: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
  return ((value - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}

export function round_to(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

export function average(...values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function sum(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

export function min(...values: number[]): number {
  return Math.min(...values)
}

export function max(...values: number[]): number {
  return Math.max(...values)
}

export function is_between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

export function format_number(value: number): string {
  return value.toLocaleString()
}

export function format_compact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export function format_bytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i     = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function format_percentage(value: number, decimals: number = 1): string {
  return `${round_to(value, decimals)}%`
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function roman(num: number): string {
  const lookup: [string, number][] = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
    ["C", 100],  ["XC", 90],  ["L", 50],  ["XL", 40],
    ["X", 10],   ["IX", 9],   ["V", 5],   ["IV", 4],
    ["I", 1],
  ]
  let result = ""
  for (const [letter, value] of lookup) {
    while (num >= value) {
      result += letter
      num -= value
    }
  }
  return result
}
