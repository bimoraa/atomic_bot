export function capitalize(str: string): string {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function title_case(str: string): string {
  return str.split(" ").map(capitalize).join(" ")
}

export function camel_case(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toLowerCase())
}

export function snake_case(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
    .replace(/^_/, "")
}

export function kebab_case(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .replace(/^-/, "")
}

export function truncate(str: string, length: number, suffix: string = "..."): string {
  if (str.length <= length) return str
  return str.slice(0, length - suffix.length) + suffix
}

export function pad_start(str: string, length: number, char: string = " "): string {
  return str.padStart(length, char)
}

export function pad_end(str: string, length: number, char: string = " "): string {
  return str.padEnd(length, char)
}

export function pad_center(str: string, length: number, char: string = " "): string {
  const pad_length = length - str.length
  if (pad_length <= 0) return str
  const left  = Math.floor(pad_length / 2)
  const right = pad_length - left
  return char.repeat(left) + str + char.repeat(right)
}

export function reverse(str: string): string {
  return str.split("").reverse().join("")
}

export function remove_accents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function slugify(str: string): string {
  return remove_accents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function escape_regex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function escape_html(str: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return str.replace(/[&<>"']/g, (c) => entities[c])
}

export function unescape_html(str: string): string {
  const entities: Record<string, string> = {
    "&amp;":  "&",
    "&lt;":   "<",
    "&gt;":   ">",
    "&quot;": '"',
    "&#39;":  "'",
  }
  return str.replace(/&(amp|lt|gt|quot|#39);/g, (m) => entities[m])
}

export function word_count(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length
}

export function char_count(str: string, exclude_spaces: boolean = false): number {
  return exclude_spaces ? str.replace(/\s/g, "").length : str.length
}

export function is_empty(str: string): boolean {
  return str.trim().length === 0
}

export function contains(str: string, search: string, case_sensitive: boolean = true): boolean {
  if (case_sensitive) return str.includes(search)
  return str.toLowerCase().includes(search.toLowerCase())
}

export function starts_with(str: string, search: string, case_sensitive: boolean = true): boolean {
  if (case_sensitive) return str.startsWith(search)
  return str.toLowerCase().startsWith(search.toLowerCase())
}

export function ends_with(str: string, search: string, case_sensitive: boolean = true): boolean {
  if (case_sensitive) return str.endsWith(search)
  return str.toLowerCase().endsWith(search.toLowerCase())
}

export function extract_numbers(str: string): number[] {
  const matches = str.match(/-?\d+(\.\d+)?/g)
  return matches ? matches.map(Number) : []
}

export function extract_urls(str: string): string[] {
  const regex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
  return str.match(regex) || []
}

export function extract_emails(str: string): string[] {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  return str.match(regex) || []
}

export function extract_mentions(str: string): string[] {
  const regex = /<@!?(\d+)>/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(str)) !== null) {
    matches.push(match[1])
  }
  return matches
}

export function extract_channels(str: string): string[] {
  const regex = /<#(\d+)>/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(str)) !== null) {
    matches.push(match[1])
  }
  return matches
}

export function extract_roles(str: string): string[] {
  const regex = /<@&(\d+)>/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(str)) !== null) {
    matches.push(match[1])
  }
  return matches
}

export function strip_mentions(str: string): string {
  return str.replace(/<@!?\d+>|<#\d+>|<@&\d+>/g, "").trim()
}

export function mask(str: string, visible_start: number = 0, visible_end: number = 0, mask_char: string = "*"): string {
  const len = str.length
  if (visible_start + visible_end >= len) return str
  const start  = str.slice(0, visible_start)
  const end    = str.slice(-visible_end || undefined)
  const middle = mask_char.repeat(len - visible_start - visible_end)
  return start + middle + (visible_end > 0 ? end : "")
}
