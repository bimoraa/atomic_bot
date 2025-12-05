export function is_valid_snowflake(id: string): boolean {
  return /^\d{17,19}$/.test(id)
}

export function is_valid_url(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function is_valid_email(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function is_valid_hex_color(color: string): boolean {
  return /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color)
}

export function is_valid_discord_invite(invite: string): boolean {
  return /^(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+$/.test(invite)
}

export function is_valid_webhook_url(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url)
}

export function is_empty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

export function is_between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function has_length(value: string, min: number, max?: number): boolean {
  const length = value.length
  if (max === undefined) return length >= min
  return length >= min && length <= max
}

export function matches_pattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value)
}

export function is_alphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value)
}

export function contains_only(value: string, allowed: string): boolean {
  const allowed_set = new Set(allowed.split(""))
  return value.split("").every((char) => allowed_set.has(char))
}

export function sanitize_input(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export function remove_mentions(content: string): string {
  return content
    .replace(/<@!?\d+>/g, "[user]")
    .replace(/<@&\d+>/g, "[role]")
    .replace(/@everyone/g, "[everyone]")
    .replace(/@here/g, "[here]")
}

export function extract_snowflakes(content: string): string[] {
  const matches = content.match(/\d{17,19}/g)
  return matches || []
}

export function extract_urls(content: string): string[] {
  const url_regex = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g
  const matches = content.match(url_regex)
  return matches || []
}

export function hex_to_int(hex: string): number {
  return parseInt(hex.replace("#", ""), 16)
}

export function int_to_hex(int: number): string {
  return "#" + int.toString(16).padStart(6, "0")
}
