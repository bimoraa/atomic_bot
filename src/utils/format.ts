export function code(text: string): string {
  return `\`${text}\``
}

export function code_block(text: string, language?: string): string {
  return `\`\`\`${language || ""}\n${text}\n\`\`\``
}

export function bold(text: string): string {
  return `**${text}**`
}

export function italic(text: string): string {
  return `*${text}*`
}

export function underline(text: string): string {
  return `__${text}__`
}

export function strikethrough(text: string): string {
  return `~~${text}~~`
}

export function spoiler(text: string): string {
  return `||${text}||`
}

export function quote(text: string): string {
  return `> ${text}`
}

export function block_quote(text: string): string {
  return `>>> ${text}`
}

export function heading(text: string, level: 1 | 2 | 3 = 1): string {
  return `${"#".repeat(level)} ${text}`
}

export function subtext(text: string): string {
  return `-# ${text}`
}

export function link(text: string, url: string): string {
  return `[${text}](${url})`
}

export function masked_link(text: string, url: string): string {
  return `[${text}](<${url}>)`
}

export function user_mention(user_id: string): string {
  return `<@${user_id}>`
}

export function role_mention(role_id: string): string {
  return `<@&${role_id}>`
}

export function channel_mention(channel_id: string): string {
  return `<#${channel_id}>`
}

export function slash_command(name: string, id: string): string {
  return `</${name}:${id}>`
}

export function channel_url(guild_id: string, channel_id: string): string {
  return `https://discord.com/channels/${guild_id}/${channel_id}`
}

export function message_url(guild_id: string, channel_id: string, message_id: string): string {
  return `https://discord.com/channels/${guild_id}/${channel_id}/${message_id}`
}

export function emoji(name: string, id: string, animated?: boolean): string {
  return animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`
}

export function emoji_object(name: string, id?: string): { name: string; id?: string } {
  return { name, id }
}

export function join_lines(...lines: string[]): string {
  return lines.join("\n")
}

export function bullet_list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
}

export function numbered_list(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n")
}

export function truncate(text: string, max_length: number, suffix: string = "..."): string {
  if (text.length <= max_length) return text
  return text.slice(0, max_length - suffix.length) + suffix
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function title_case(text: string): string {
  return text.split(" ").map(capitalize).join(" ")
}

export function plural(count: number, singular: string, plural_form?: string): string {
  return count === 1 ? singular : (plural_form || singular + "s")
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function format_number(n: number): string {
  return n.toLocaleString()
}

export function format_bytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
}

export function format_duration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function progress_bar(current: number, max: number, length: number = 10): string {
  const filled = Math.round((current / max) * length)
  const empty = length - filled
  return "█".repeat(filled) + "░".repeat(empty)
}

export function table(headers: string[], rows: string[][]): string {
  const col_widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]?.length || 0)))
  const header_row = headers.map((h, i) => h.padEnd(col_widths[i])).join(" | ")
  const separator = col_widths.map((w) => "-".repeat(w)).join("-+-")
  const data_rows = rows.map((r) => r.map((c, i) => (c || "").padEnd(col_widths[i])).join(" | "))
  return [header_row, separator, ...data_rows].join("\n")
}

export const default_avatar = "https://cdn.discordapp.com/embed/avatars/0.png"
export const logo_url = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true"
