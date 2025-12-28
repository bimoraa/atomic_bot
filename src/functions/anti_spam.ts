import { Client, Message, GuildMember, PermissionFlagsBits } from "discord.js"
import { component, format, time }                          from "../utils"

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
  /free\s*nitro/gi,
  /claim\s*(?:your|free)\s*(?:nitro|discord)/gi,
  /(?:https?:\/\/)?(?:www\.)?(?:steamcommunity|steampowered|steam-\w+)\.[a-z]+\/\S+/gi,
  /(?:https?:\/\/)?(?:www\.)?disc(?:o|0)rd(?:app)?\.(?:gg|com|gift)/gi,
  /@everyone.*(?:nitro|free|gift|giveaway)/gi,
  /(?:airdrop|nft|crypto|bitcoin|eth|token).*(?:claim|free|win)/gi,
]

const LOG_CHANNEL_ID = "1452086939866894420"

async function send_alert(client: Client, alert_message: any): Promise<void> {
  try {
    const log_channel = await client.channels.fetch(LOG_CHANNEL_ID)
    if (!log_channel?.isTextBased() || !("send" in log_channel)) return
    await log_channel.send(alert_message)
  } catch (error) {
    console.error("[anti_spam] Failed to send alert:", error)
  }
}

function is_suspicious_content(content: string): string | null {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      return pattern.source
    }
  }
  return null
}

export function check_spam(message: Message, client: Client): boolean {
  if (!message.guild || message.author.bot) return false
  
  const member = message.member
  if (!member) return false
  
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return false
  
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
  
  const suspicious_pattern = is_suspicious_content(message.content)
  if (suspicious_pattern) {
    handle_suspicious_message(message, client, suspicious_pattern, member)
    return true
  }
  
  const mention_count = message.mentions.users.size + message.mentions.roles.size
  if (mention_count >= SPAM_CONFIG.mention_limit) {
    handle_mention_spam(message, client, mention_count, member)
    return true
  }
  
  const duplicate_count = tracker.messages.filter(msg => msg.content === message.content).length
  if (duplicate_count >= SPAM_CONFIG.duplicate_limit) {
    handle_duplicate_spam(message, client, duplicate_count, member, tracker)
    return true
  }
  
  if (tracker.messages.length >= SPAM_CONFIG.message_limit) {
    handle_rapid_spam(message, client, tracker.messages.length, member, tracker)
    return true
  }
  
  return false
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
    
    const alert = component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components: [
            component.section({
              content: [
                `## Suspicious Message Detected`,
                `${format.bold("User:")} ${format.user_mention(member.id)} (${format.code(member.user.tag)})`,
                `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                `${format.bold("Pattern:")} ${format.code(pattern)}`,
                `${format.bold("Content:")} ${format.code_block(message.content.slice(0, 500))}`,
                `${format.bold("Action:")} Message deleted, user timed out for 5 minutes`,
                `${format.bold("Account Age:")} ${time.relative_time(Math.floor(member.user.createdTimestamp / 1000))}`,
              ],
              thumbnail: member.user.displayAvatarURL({ size: 256 }),
            }),
          ],
        }),
      ],
    })
    
    await send_alert(client, alert)
  } catch (error) {
    console.error("[anti_spam] Error handling suspicious message:", error)
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
    
    const alert = component.build_message({
      components: [
        component.container({
          accent_color: 0xFEE75C,
          components: [
            component.section({
              content: [
                `## Mention Spam Detected`,
                `${format.bold("User:")} ${format.user_mention(member.id)} (${format.code(member.user.tag)})`,
                `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                `${format.bold("Mentions:")} ${mention_count} mentions`,
                `${format.bold("Action:")} Message deleted, user timed out for 10 minutes`,
              ],
              thumbnail: member.user.displayAvatarURL({ size: 256 }),
            }),
          ],
        }),
      ],
    })
    
    await send_alert(client, alert)
  } catch (error) {
    console.error("[anti_spam] Error handling mention spam:", error)
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
      
      const alert = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  `## Duplicate Message Spam`,
                  `${format.bold("User:")} ${format.user_mention(member.id)} (${format.code(member.user.tag)})`,
                  `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                  `${format.bold("Duplicates:")} ${duplicate_count} identical messages`,
                  `${format.bold("Warnings:")} ${tracker.warnings}`,
                  `${format.bold("Action:")} Timed out for ${Math.floor(timeout_duration / 60000)} minutes`,
                ],
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
              }),
            ],
          }),
        ],
      })
      
      await send_alert(client, alert)
    }
  } catch (error) {
    console.error("[anti_spam] Error handling duplicate spam:", error)
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
      
      const alert = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  `## Rapid Message Spam`,
                  `${format.bold("User:")} ${format.user_mention(member.id)} (${format.code(member.user.tag)})`,
                  `${format.bold("Channel:")} ${format.channel_mention(message.channel.id)}`,
                  `${format.bold("Messages:")} ${message_count} messages in ${SPAM_CONFIG.time_window / 1000}s`,
                  `${format.bold("Warnings:")} ${tracker.warnings}`,
                  `${format.bold("Action:")} Timed out for ${Math.floor(timeout_duration / 60000)} minutes`,
                ],
                thumbnail: member.user.displayAvatarURL({ size: 256 }),
              }),
            ],
          }),
        ],
      })
      
      await send_alert(client, alert)
    }
  } catch (error) {
    console.error("[anti_spam] Error handling rapid spam:", error)
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
