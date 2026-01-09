// - Discord markdown and formatting utilities - \\

/**
 * @param {string} text - Text to format
 * @returns {string} Inline code formatted text
 */
export function code(text: string): string {
  return `\`${text}\``
}

/**
 * @param {string} text - Code content
 * @param {string} language - Optional syntax highlighting language
 * @returns {string} Code block formatted text
 */
export function code_block(text: string, language?: string): string {
  return `\`\`\`${language || ""}\n${text}\n\`\`\``
}

/**
 * @param {string} text - Text to format
 * @returns {string} Bold formatted text
 */
export function bold(text: string): string {
  return `**${text}**`
}

/**
 * @param {string} text - Text to format
 * @returns {string} Italic formatted text
 */
export function italic(text: string): string {
  return `*${text}*`
}

/**
 * @param {string} text - Text to format
 * @returns {string} Underlined text
 */
export function underline(text: string): string {
  return `__${text}__`
}

/**
 * @param {string} text - Text to format
 * @returns {string} Strikethrough formatted text
 */
export function strikethrough(text: string): string {
  return `~~${text}~~`
}

/**
 * @param {string} text - Text to hide
 * @returns {string} Spoiler formatted text
 */
export function spoiler(text: string): string {
  return `||${text}||`
}

/**
 * @param {string} text - Text to quote
 * @returns {string} Single line quote
 */
export function quote(text: string): string {
  return `> ${text}`
}

/**
 * @param {string} text - Text to quote
 * @returns {string} Block quote
 */
export function block_quote(text: string): string {
  return `>>> ${text}`
}

/**
 * @param {string} text - Heading text
 * @param {1 | 2 | 3} level - Heading level
 * @returns {string} Formatted heading
 */
export function heading(text: string, level: 1 | 2 | 3 = 1): string {
  return `${"#".repeat(level)} ${text}`
}

/**
 * @param {string} text - Text for subtext
 * @returns {string} Subtext formatted text
 */
export function subtext(text: string): string {
  return `-# ${text}`
}

/**
 * @param {string} text - Link text
 * @param {string} url - Link URL
 * @returns {string} Markdown link
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`
}

/**
 * @param {string} text - Link text
 * @param {string} url - Link URL
 * @returns {string} Masked markdown link
 */
export function masked_link(text: string, url: string): string {
  return `[${text}](<${url}>)`
}

/**
 * @param {string} user_id - Discord user ID
 * @returns {string} User mention
 */
export function user_mention(user_id: string): string {
  return `<@${user_id}>`
}

/**
 * @param {string} role_id - Discord role ID
 * @returns {string} Role mention
 */
export function role_mention(role_id: string): string {
  return `<@&${role_id}>`
}

/**
 * @param {string} channel_id - Discord channel ID
 * @returns {string} Channel mention
 */
export function channel_mention(channel_id: string): string {
  return `<#${channel_id}>`
}

/**
 * @param {string} name - Command name
 * @param {string} id - Command ID
 * @returns {string} Slash command mention
 */
export function slash_command(name: string, id: string): string {
  return `</${name}:${id}>`
}

/**
 * @param {string} guild_id - Discord guild ID
 * @param {string} channel_id - Discord channel ID
 * @returns {string} Channel URL
 */
export function channel_url(guild_id: string, channel_id: string): string {
  return `https://discord.com/channels/${guild_id}/${channel_id}`
}

/**
 * @param {string} guild_id - Discord guild ID
 * @param {string} channel_id - Discord channel ID
 * @param {string} message_id - Discord message ID
 * @returns {string} Message URL
 */
export function message_url(guild_id: string, channel_id: string, message_id: string): string {
  return `https://discord.com/channels/${guild_id}/${channel_id}/${message_id}`
}

/**
 * @param {string} name - Emoji name
 * @param {string} id - Emoji ID
 * @param {boolean} animated - Whether emoji is animated
 * @returns {string} Discord emoji format
 */
export function emoji(name: string, id: string, animated?: boolean): string {
  return animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`
}

/**
 * @param {string} name - Emoji name
 * @param {string} id - Optional emoji ID
 * @returns {{ name: string; id?: string }} Emoji object
 */
export function emoji_object(name: string, id?: string): { name: string; id?: string } {
  return { name, id }
}

/**
 * @param {...string} lines - Lines to join
 * @returns {string} Joined lines with newlines
 */
export function join_lines(...lines: string[]): string {
  return lines.join("\n")
}

/**
 * @param {string[]} items - List items
 * @returns {string} Bullet point list
 */
export function bullet_list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
}

/**
 * @param {string[]} items - List items
 * @returns {string} Numbered list
 */
export function numbered_list(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n")
}

/**
 * @param {string} text - Text to truncate
 * @param {number} max_length - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated text
 */
export function truncate(text: string, max_length: number, suffix: string = "..."): string {
  if (text.length <= max_length) return text
  return text.slice(0, max_length - suffix.length) + suffix
}

/**
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * @param {string} text - Text to convert
 * @returns {string} Title case text
 */
export function title_case(text: string): string {
  return text.split(" ").map(capitalize).join(" ")
}

/**
 * @param {number} count - Count of items
 * @param {string} singular - Singular form
 * @param {string} plural_form - Optional plural form
 * @returns {string} Singular or plural form based on count
 */
export function plural(count: number, singular: string, plural_form?: string): string {
  return count === 1 ? singular : (plural_form || singular + "s")
}

/**
 * @param {number} n - Number to format
 * @returns {string} Ordinal number string
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * @param {number} n - Number to format
 * @returns {string} Formatted number with commas
 */
export function format_number(n: number): string {
  return n.toLocaleString()
}

/**
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted byte size
 */
export function format_bytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
}

/**
 * @param {number} ms - Milliseconds to format
 * @returns {string} Human readable duration
 */
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

/**
 * @param {number} current - Current progress value
 * @param {number} max - Maximum value
 * @param {number} length - Progress bar character length
 * @returns {string} Progress bar string
 */
export function progress_bar(current: number, max: number, length: number = 10): string {
  const filled = Math.round((current / max) * length)
  const empty = length - filled
  return "█".repeat(filled) + "░".repeat(empty)
}

/**
 * @param {string[]} headers - Table headers
 * @param {string[][]} rows - Table rows
 * @returns {string} Formatted table
 */
export function table(headers: string[], rows: string[][]): string {
  const col_widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]?.length || 0)))
  const header_row = headers.map((h, i) => h.padEnd(col_widths[i])).join(" | ")
  const separator = col_widths.map((w) => "-".repeat(w)).join("-+-")
  const data_rows = rows.map((r) => r.map((c, i) => (c || "").padEnd(col_widths[i])).join(" | "))
  return [header_row, separator, ...data_rows].join("\n")
}

export const default_avatar = "https://cdn.discordapp.com/embed/avatars/0.png"
export const logo_url = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true"
