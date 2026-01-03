import { Message, Client } from "discord.js"
import { remove_afk, get_afk, is_afk } from "../../../services/afk"
import { component } from "../../../utils"
import { log_error } from "../../../utils/error_logger"

export async function handle_afk_return(message: Message): Promise<void> {
  const afk_removed = await remove_afk(message.author.id)
  
  if (!afk_removed) return

  const member = message.guild?.members.cache.get(message.author.id)
  
  if (member) {
    try {
      await member.setNickname(afk_removed.original_nickname)
    } catch {}
  }

  const afk_timestamp = Math.floor(afk_removed.timestamp / 1000)

  const welcome_back = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`Welcome back! You were AFK <t:${afk_timestamp}:R>`),
        ],
      }),
    ],
  })

  const reply = await message.reply(welcome_back).catch(() => null)
  
  if (reply) {
    setTimeout(() => {
      reply.delete().catch(() => {})
    }, 15000)
  }
}

export async function handle_afk_mentions(message: Message): Promise<void> {
  const mentioned_users: Set<string> = new Set()
  
  for (const mentioned of message.mentions.users.values()) {
    mentioned_users.add(mentioned.id)
  }
  
  if (message.reference) {
    try {
      const replied_message = await message.fetchReference()
      if (replied_message && !replied_message.author.bot) {
        mentioned_users.add(replied_message.author.id)
        console.log(`[ - AFK - ] Detected reply to user: ${replied_message.author.username}`)
      }
    } catch (error) {
      console.log(`[ - AFK - ] Failed to fetch referenced message:`, error)
    }
  }
  
  for (const user_id of mentioned_users) {
    if (!is_afk(user_id)) continue

    const afk_data = get_afk(user_id)
    
    if (!afk_data) continue
    
    console.log(`[ - AFK - ] Notifying about AFK user: ${user_id}`)

    const afk_notice = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`<@${user_id}> is currently AFK: **${afk_data.reason}** - <t:${Math.floor(afk_data.timestamp / 1000)}:R>`),
          ],
        }),
      ],
    })

    try {
      const reply = await message.reply({ ...afk_notice, allowedMentions: { users: [] } })
      console.log(`[ - AFK - ] Successfully sent AFK notice for user ${user_id}`)
    } catch (error) {
      console.error(`[ - AFK - ] Failed to send AFK notice:`, error)
      await log_error(message.client, error as Error, "AFK Notice Failed", {
        user_id      : user_id,
        channel      : message.channel.id,
        afk_reason   : afk_data.reason,
      }).catch(() => {})
    }
    
    break
  }
}
