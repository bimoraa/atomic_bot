import { Message, Client } from "discord.js"
import { remove_afk, get_afk, is_afk } from "../../../services/afk"
import { component } from "../../../utils"

export async function handle_afk_return(message: Message): Promise<void> {
  const afk_removed = remove_afk(message.author.id)
  
  if (!afk_removed) return

  const member = message.guild?.members.cache.get(message.author.id)
  
  if (member) {
    try {
      await member.setNickname(afk_removed.original_nickname)
    } catch {}
  }

  const duration_seconds = Math.floor((Date.now() - afk_removed.timestamp) / 1000)

  const welcome_back = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`Welcome back! You were AFK for ${duration_seconds} seconds ago`),
        ],
      }),
    ],
  })

  await message.reply(welcome_back).catch(() => {})
}

export async function handle_afk_mentions(message: Message): Promise<void> {
  for (const mentioned of message.mentions.users.values()) {
    if (!is_afk(mentioned.id)) continue

    const afk_data = get_afk(mentioned.id)
    
    if (!afk_data) continue

    const afk_notice = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : `<@${mentioned.id}> is currently AFK: **${afk_data.reason}** - <t:${Math.floor(afk_data.timestamp / 1000)}:R>`
            }),
          ],
        }),
      ],
    })

    await message.reply({ ...afk_notice, allowedMentions: { users: [] } }).catch(() => {})
    break
  }
}
