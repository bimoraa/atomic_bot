import { Client, Message, GuildMember, PermissionFlagsBits } from "discord.js"
import { component, format, time }                          from "../utils"
import { log_error }                                        from "../utils/error_logger"

interface spam_tracker {
  messages    : { content: string; timestamp: number }[]
  warnings    : number
  last_warning: number
}

const user_message_tracker = new Map<string, spam_tracker>()

const SPAM_CONFIG = {
  message_limit   : 5,
  time_window     : 5000,
  duplicate_limit : 3,
  mention_limit   : 5,
  link_limit      : 3,
  warning_cooldown: 30000,
}

const SUSPICIOUS_PATTERNS = [
  /discord\.(?:gg|com\/invite)\/[a-zA-Z0-9]+/gi,
  /discord\.com\/gift\/[a-zA-Z0-9]+/gi,
  /disc(?:o|0)rd(?:app)?\.(?:gg|com)\/(?:gift|invite|nitro)\/[a-zA-Z0-9]+/gi,
  /free\s*(?:discord\s*)?nitro/gi,
  /claim\s*(?:your|free)\s*(?:nitro|discord)/gi,
  /(?:https?:\/\/)?(?:www\.)?(?:steamcommunity|steampowered|steam-\w+)\.[a-z]+\/\S+/gi,
  /@everyone.*(?:nitro|free|gift|giveaway)/gi,
  /(?:airdrop|nft|crypto|bitcoin|eth|token).*(?:claim|free|win)/gi,
  /https?:\/\/(?:www\.)?imgur\.com\/\S+/gi,
]

const LOG_CHANNEL_ID = "1452086939866894420"

async function send_alert(client: Client, alert_message: any): Promise<void> {
  try {
    const log_channel = await client.channels.fetch(LOG_CHANNEL_ID)
    if (!log_channel?.isTextBased() || !("send" in log_channel)) return
    await log_channel.send(alert_message)
  } catch (error) {
    const payload_preview = (() => {
      try {
        return JSON.stringify(alert_message).slice(0, 500)
      } catch {
        return "unserializable payload"
      }
    })()
    console.error("[anti_spam] Error sending alert:", error)
    await log_error(client, error as Error, "Anti-Spam: Send Alert", {
      log_channel_id : LOG_CHANNEL_ID,
      payload_preview: payload_preview,
    }).catch(() => {})
  }
}

function is_suspicious_content(content: string): string | null {
  const zero_width_chars = /[\u200B-\u200F\u2060-\u2064]/g
  const zero_width_count = (content.match(zero_width_chars) || []).length
  if (zero_width_count >= 10) return "zero_width_flood"

  const url_regex  = /https?:\/\/\S+/gi
  const url_matches = content.match(url_regex) || []
  if (url_matches.length >= 4) return "multiple_links"

  const pipe_flood = /\|{20,}/
  if (pipe_flood.test(content)) return "pipe_flood"

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      return pattern.source
    }
  }
  return null
}

export function check_spam(message: Message, client: Client): boolean {
  try {
    if (!message.guild || message.author.bot) return false
    
    const member = message.member
    if (!member) {
      console.log("[anti_spam] Skip: no member found")
      return false
    }
    
    if (!message.content || message.content.trim().length === 0) {
      console.log("[anti_spam] Skip: empty content")
      return false
    }
    
    const user_id = message.author.id
    const now     = Date.now()
    
    if (!user_message_tracker.has(user_id)) {
      user_message_tracker.set(user_id, {
        messages    : [],
        warnings    : 0,
        last_warning: 0,
      })
    }
    
    const tracker = user_message_tracker.get(user_id)!
    
    tracker.messages = tracker.messages.filter(msg => now - msg.timestamp < SPAM_CONFIG.time_window)
    tracker.messages.push({ content: message.content, timestamp: now })
    
    console.log(`[anti_spam] Checking message from ${message.author.tag}: "${message.content.slice(0, 50)}"`)
    
    const suspicious_pattern = is_suspicious_content(message.content)
    if (suspicious_pattern) {
      console.log(`[anti_spam] Suspicious pattern detected: ${suspicious_pattern}`)
      handle_suspicious_message(message, client, suspicious_pattern, member)
      return true
    }
    
    const mention_count = message.mentions.users.size + message.mentions.roles.size
    if (mention_count >= SPAM_CONFIG.mention_limit) {
      console.log(`[anti_spam] Mention spam detected: ${mention_count} mentions`)
      handle_mention_spam(message, client, mention_count, member)
      return true
    }
    
    const duplicate_count = tracker.messages.filter(msg => msg.content === message.content).length
    if (duplicate_count >= SPAM_CONFIG.duplicate_limit) {
      console.log(`[anti_spam] Duplicate spam detected: ${duplicate_count} duplicates`)
      handle_duplicate_spam(message, client, duplicate_count, member, tracker)
      return true
    }
    
    if (tracker.messages.length >= SPAM_CONFIG.message_limit) {
      console.log(`[anti_spam] Rapid spam detected: ${tracker.messages.length} messages`)
      handle_rapid_spam(message, client, tracker.messages.length, member, tracker)
      return true
    }
    
    return false
  } catch (error) {
    console.error("[anti_spam] Error in check_spam:", error)
    log_error(client, error as Error, "Anti-Spam Check", {
      user   : message.author.tag,
      channel: message.channel.id,
      content: message.content?.slice(0, 100) || "No content",
    }).catch(() => {})
    return false
  }
}

async function handle_suspicious_message(
  message: Message,
  client: Client,
  pattern: string,
  member: GuildMember
): Promise<void> {
  try {
    await message.delete()
    
    const timeout_duration = 5 * 60 * 1000
    await member.timeout(timeout_duration, "Suspicious message (potential scam/spam)")
    
    const content_block = format.code_block(message.content.slice(0, 500) || "(empty)")
    const created_ts    = Math.floor(message.createdTimestamp / 1000)
    const now_ts        = Math.floor(Date.now() / 1000)
    const target_id     = member.id
    const message_id    = message.id

    const alert = component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components: [
            component.section({
              content: [
                `## Suspicious Message Detected`,
                `${format.bold("Discord:")} ${format.user_mention(member.id)}`,
                `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                `${format.bold("Pattern:")} ${pattern}`,
                `${format.bold("Content:")}`,
              ],
            }),
            component.section({
              content: content_block,
            }),
            component.action_row(
              component.secondary_button("Download Details", `anti_spam_download:${target_id}:${message_id}`)
            ),
            component.divider(2),
            component.section({
              content: [
                `${format.bold("Action:")} Message deleted, user timed out for 5 minutes`,
                `${format.bold("Date:")} <t:${now_ts}:F>`,
                `${format.bold("Account Age:")} ${time.relative_time(Math.floor(member.user.createdTimestamp / 1000))}`,
                `${format.bold("Message Created:")} <t:${created_ts}:F>`,
              ],
              thumbnail: member.user.displayAvatarURL({ size: 256 }),
            }),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Un-Timeout", `anti_spam_untimeout:${target_id}`),
              component.danger_button("Ban Users", `anti_spam_ban:${target_id}`)
            ),
          ],
        }),
      ],
    })
    
    await send_alert(client, alert)
  } catch (error) {
    console.error("[anti_spam] Error handling suspicious message:", error)
    await log_error(client, error as Error, "Anti-Spam: Suspicious Message Handler", {
      user   : member.user.tag,
      channel: message.channel.id,
      pattern: pattern,
      content: message.content?.slice(0, 100) || "No content",
    }).catch(() => {})
  }
}

async function handle_mention_spam(
  message: Message,
  client: Client,
  mention_count: number,
  member: GuildMember
): Promise<void> {
  try {
    await message.delete()
    
    const timeout_duration = 10 * 60 * 1000
    await member.timeout(timeout_duration, "Mention spam")
    
    const content_block = format.code_block(message.content.slice(0, 500) || "(empty)")
    const created_ts    = Math.floor(message.createdTimestamp / 1000)
    const now_ts        = Math.floor(Date.now() / 1000)
    const target_id     = member.id
    const message_id    = message.id

    const alert = component.build_message({
      components: [
        component.container({
          accent_color: 0xFEE75C,
          components: [
            component.section({
              content: [
                `## Mention Spam Detected`,
                `${format.bold("Discord:")} ${format.user_mention(member.id)}`,
                `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                `${format.bold("Mentions:")} ${mention_count} mentions`,
                `${format.bold("Content:")}`,
              ],
            }),
            component.section({
              content: content_block,
            }),
            component.action_row(
              component.secondary_button("Download Details", `anti_spam_download:${target_id}:${message_id}`)
            ),
            component.divider(2),
            component.section({
              content: [
                `${format.bold("Action:")} Message deleted, user timed out for 10 minutes`,
                `${format.bold("Date:")} <t:${now_ts}:F>`,
                `${format.bold("Account Age:")} ${time.relative_time(Math.floor(member.user.createdTimestamp / 1000))}`,
                `${format.bold("Message Created:")} <t:${created_ts}:F>`,
              ],
              thumbnail: member.user.displayAvatarURL({ size: 256 }),
            }),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Un-Timeout", `anti_spam_untimeout:${target_id}`),
              component.danger_button("Ban Users", `anti_spam_ban:${target_id}`)
            ),
          ],
        }),
      ],
    })
    
    await send_alert(client, alert)
  } catch (error) {
    console.error("[anti_spam] Error handling mention spam:", error)
    await log_error(client, error as Error, "Anti-Spam: Mention Spam Handler", {
      user         : member.user.tag,
      channel      : message.channel.id,
      mention_count: mention_count,
    }).catch(() => {})
  }
}

async function handle_duplicate_spam(
  message: Message,
  client: Client,
  duplicate_count: number,
  member: GuildMember,
  tracker: spam_tracker
): Promise<void> {
  try {
    await message.delete()
    
    tracker.warnings++
    const now = Date.now()
    
    if (now - tracker.last_warning > SPAM_CONFIG.warning_cooldown) {
      tracker.last_warning = now
      
      const timeout_duration = Math.min(tracker.warnings * 5 * 60 * 1000, 60 * 60 * 1000)
      await member.timeout(timeout_duration, `Duplicate spam (warning ${tracker.warnings})`)
      
      const content_block = format.code_block(message.content.slice(0, 500) || "(empty)")
      const created_ts    = Math.floor(message.createdTimestamp / 1000)
      const now_ts        = Math.floor(Date.now() / 1000)
      const target_id     = member.id
      const message_id    = message.id

      const alert = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  `## Duplicate Message Spam`,
                  `${format.bold("Discord:")} ${format.user_mention(member.id)}`,
                  `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                  `${format.bold("Duplicates:")} ${duplicate_count} identical messages`,
                  `${format.bold("Warnings:")} ${tracker.warnings}`,
                  `${format.bold("Content:")}`,
                ],
              }),
              component.section({
                content: content_block,
              }),
              component.action_row(
                component.secondary_button("Download Details", `anti_spam_download:${target_id}:${message_id}`)
              ),
              component.divider(2),
              component.section({
                content: [
                  `${format.bold("Action:")} Timed out for ${Math.floor(timeout_duration / 60000)} minutes`,
                  `${format.bold("Date:")} <t:${now_ts}:F>`,
                  `${format.bold("Account Age:")} ${time.relative_time(Math.floor(member.user.createdTimestamp / 1000))}`,
                  `${format.bold("Message Created:")} <t:${created_ts}:F>`,
                ],
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
              }),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.secondary_button("Un-Timeout", `anti_spam_untimeout:${target_id}`),
                component.danger_button("Ban Users", `anti_spam_ban:${target_id}`)
              ),
            ],
          }),
        ],
      })
      
      await send_alert(client, alert)
    }
  } catch (error) {
    console.error("[anti_spam] Error handling duplicate spam:", error)
    await log_error(client, error as Error, "Anti-Spam: Duplicate Spam Handler", {
      user           : member.user.tag,
      channel        : message.channel.id,
      duplicate_count: duplicate_count,
      warnings       : tracker.warnings,
    }).catch(() => {})
  }
}

async function handle_rapid_spam(
  message: Message,
  client: Client,
  message_count: number,
  member: GuildMember,
  tracker: spam_tracker
): Promise<void> {
  try {
    await message.delete()
    
    tracker.warnings++
    const now = Date.now()
    
    if (now - tracker.last_warning > SPAM_CONFIG.warning_cooldown) {
      tracker.last_warning = now
      
      const timeout_duration = Math.min(tracker.warnings * 3 * 60 * 1000, 30 * 60 * 1000)
      await member.timeout(timeout_duration, `Rapid messaging (warning ${tracker.warnings})`)
      
      const content_block = format.code_block(message.content.slice(0, 500) || "(empty)")
      const created_ts    = Math.floor(message.createdTimestamp / 1000)
      const now_ts        = Math.floor(Date.now() / 1000)
      const target_id     = member.id
      const message_id    = message.id

      const alert = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  `## Rapid Message Spam`,
                  `${format.bold("Discord:")} ${format.user_mention(member.id)}`,
                  `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                  `${format.bold("Messages:")} ${message_count} messages in ${SPAM_CONFIG.time_window / 1000}s`,
                  `${format.bold("Warnings:")} ${tracker.warnings}`,
                  `${format.bold("Content:")}`,
                ],
              }),
              component.section({
                content: content_block,
              }),
              component.action_row(
                component.secondary_button("Download Details", `anti_spam_download:${target_id}:${message_id}`)
              ),
              component.divider(2),
              component.section({
                content: [
                  `${format.bold("Action:")} Timed out for ${Math.floor(timeout_duration / 60000)} minutes`,
                  `${format.bold("Date:")} <t:${now_ts}:F>`,
                  `${format.bold("Account Age:")} ${time.relative_time(Math.floor(member.user.createdTimestamp / 1000))}`,
                  `${format.bold("Message Created:")} <t:${created_ts}:F>`,
                ],
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
              }),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.secondary_button("Un-Timeout", `anti_spam_untimeout:${target_id}`),
                component.danger_button("Ban Users", `anti_spam_ban:${target_id}`)
              ),
            ],
          }),
        ],
      })
      
      await send_alert(client, alert)
    }
  } catch (error) {
    console.error("[anti_spam] Error handling rapid spam:", error)
    await log_error(client, error as Error, "Anti-Spam: Rapid Spam Handler", {
      user         : member.user.tag,
      channel      : message.channel.id,
      message_count: message_count,
      warnings     : tracker.warnings,
    }).catch(() => {})
  }
}

setInterval(() => {
  const now = Date.now()
  
  for (const [user_id, tracker] of user_message_tracker.entries()) {
    tracker.messages = tracker.messages.filter(msg => now - msg.timestamp < SPAM_CONFIG.time_window)
    
    if (tracker.messages.length === 0 && now - tracker.last_warning > SPAM_CONFIG.warning_cooldown * 2) {
      user_message_tracker.delete(user_id)
    }
  }
}, 60000)
