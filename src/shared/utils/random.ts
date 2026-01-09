export function random_int(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function random_float(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function random_element<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function random_elements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

export function random_string(length: number, charset?: string): string {
  const chars = charset || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result  = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function random_hex_color(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`
}

export function random_boolean(probability: number = 0.5): boolean {
  return Math.random() < probability
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function snowflake(): string {
  const timestamp = BigInt(Date.now() - 1420070400000) << 22n
  const random    = BigInt(Math.floor(Math.random() * 4194303))
  return (timestamp | random).toString()
}
