export function get(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? ""
}

export function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env: ${key}`)
  return value
}

export function int(key: string, fallback: number = 0): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

export function float(key: string, fallback: number = 0): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

export function bool(key: string, fallback: boolean = false): boolean {
  const value = process.env[key]?.toLowerCase()
  if (!value) return fallback
  return ["true", "1", "yes", "on"].includes(value)
}

export function array(key: string, separator: string = ","): string[] {
  const value = process.env[key]
  if (!value) return []
  return value.split(separator).map((s) => s.trim()).filter(Boolean)
}

export function json<T>(key: string, fallback?: T): T | undefined {
  const value = process.env[key]
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function is_production(): boolean {
  return process.env.NODE_ENV === "production"
}

export function is_development(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV
}

export function is_test(): boolean {
  return process.env.NODE_ENV === "test"
}

export function node_env(): string {
  return process.env.NODE_ENV ?? "development"
}
