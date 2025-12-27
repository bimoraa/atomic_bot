import { Events, Message, PartialMessage, TextChannel } from "discord.js"
import { client }                                       from ".."
import { component, format, api, db, time }             from "../utils"

interface ghost_ping_entry {
  message_id : string
  author_id  : string
  author_tag : string
  channel_id : string
  guild_id   : string
  content    : string
  mentioned  : string[]
  timestamp  : number
}

client.on(Events.MessageDelete, async (message: Message | PartialMessage) => {
  try {
    if (!message.guild) return
    if (message.author?.bot) return
    
    const has_user_mentions = message.mentions?.users && message.mentions.users.size > 0
    const has_role_mentions = message.mentions?.roles && message.mentions.roles.size > 0
    const has_everyone      = message.mentions?.everyone
    
    if (!has_user_mentions && !has_role_mentions && !has_everyone) return
    
    const channel = message.channel as TextChannel
    if (!channel || !channel.isTextBased()) return
    
    const mentioned_user_ids: string[] = []
    const mentions_list: string[]      = []
    
    if (has_user_mentions) {
      message.mentions.users.forEach((user) => {
        mentioned_user_ids.push(user.id)
        mentions_list.push(format.user_mention(user.id))
      })
    }
    
    if (has_role_mentions) {
      message.mentions.roles.forEach((role) => {
        mentions_list.push(format.role_mention(role.id))
      })
    }
    
    if (has_everyone) {
      mentions_list.push("@everyone")
    }
    
    const author_name    = message.author?.tag || "Unknown User"
    const author_mention = message.author?.id ? format.user_mention(message.author.id) : "Unknown User"
    const content        = message.content || format.italic("No content available")
    const mentions_text  = mentions_list.join(", ")
    const timestamp_now  = Date.now()
    
    if (db.is_connected() && message.id && message.author?.id) {
      const database         = db.get_db()
      const ghost_ping_coll  = database.collection<ghost_ping_entry>("ghost_pings")
      
      await ghost_ping_coll.insertOne({
        message_id : message.id,
        author_id  : message.author.id,
        author_tag : author_name,
        channel_id : channel.id,
        guild_id   : message.guild.id,
        content    : message.content || "",
        mentioned  : mentioned_user_ids,
        timestamp  : timestamp_now,
      })
    }
    
    const ghost_ping_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Ghost Ping Detected`,
                `${format.bold("Author:")} ${author_mention} (${format.code(author_name)})`,
                `${format.bold("Mentioned:")} ${mentions_text}`,
                `${format.bold("Message:")} ${content}`,
                `${format.bold("Time:")} ${time.full_date_time(Math.floor(timestamp_now / 1000))}`,
              ],
            }),
          ],
        }),
      ],
    })
    
    await api.send_components_v2(channel.id, api.get_token(), ghost_ping_message)
    
  } catch (error) {
    console.error("[message_delete] Error:", error)
  }
})
