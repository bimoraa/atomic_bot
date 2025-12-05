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

export function user_mention(user_id: string): string {
  return `<@${user_id}>`
}

export function role_mention(role_id: string): string {
  return `<@&${role_id}>`
}

export function channel_mention(channel_id: string): string {
  return `<#${channel_id}>`
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

export const default_avatar = "https://cdn.discordapp.com/embed/avatars/0.png"
export const logo_url = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true"
