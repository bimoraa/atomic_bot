import { Client, User, PartialUser } from "discord.js"
import { db, component }             from "../utils"
import { log_error }                 from "../utils/error_logger"

interface server_tag_user {
  user_id    : string
  guild_id   : string
  username   : string
  tag        : string
  added_at   : number
}

const COLLECTION      = "server_tag_users"
const TARGET_GUILD_ID = "1221481607748001822"

export async function check_server_tag_change(
  client   : Client,
  old_user : User | PartialUser,
  new_user : User
): Promise<void> {
  try {
    const old_tag = old_user.primaryGuild?.tag
    const new_tag = new_user.primaryGuild?.tag
    
    const old_guild_id = old_user.primaryGuild?.identityGuildId
    const new_guild_id = new_user.primaryGuild?.identityGuildId
    
    if (!old_tag && new_tag && new_guild_id === TARGET_GUILD_ID) {
      const existing = await db.find_one<server_tag_user>(COLLECTION, {
        user_id  : new_user.id,
        guild_id : TARGET_GUILD_ID,
      })
      
      if (!existing) {
        const tag_data: server_tag_user = {
          user_id  : new_user.id,
          guild_id : TARGET_GUILD_ID,
          username : new_user.username,
          tag      : new_tag,
          added_at : Date.now(),
        }
        
        await db.insert_one(COLLECTION, tag_data)
        
        const guild = client.guilds.cache.get(TARGET_GUILD_ID)
        const guild_name = guild?.name || "our server"
        
        const dm_message = component.build_message({
          components: [
            component.container({
              accent_color: 0x5865F2,
              components: [
                component.text([
                  `## Thanks for using our server tag!`,
                  `We appreciate you representing **${guild_name}** with the tag **${new_tag}** in your profile.`,
                  ``,
                  `You're now part of our tagged community!`,
                ]),
              ],
            }),
          ],
        })
        
        await new_user.send(dm_message).catch(() => {
          console.log(`[ - SERVER TAG - ] Could not DM user ${new_user.username}`)
        })
        
        console.log(`[ - SERVER TAG - ] User ${new_user.username} added server tag: ${new_tag}`)
      }
    }
    
    if (old_tag && old_guild_id === TARGET_GUILD_ID && (!new_tag || new_guild_id !== TARGET_GUILD_ID)) {
      await db.delete_one(COLLECTION, {
        user_id  : new_user.id,
        guild_id : TARGET_GUILD_ID,
      })
      
      console.log(`[ - SERVER TAG - ] User ${new_user.username} removed server tag`)
    }
  } catch (error) {
    await log_error(client, error as Error, "Server Tag Checker", {
      user: new_user.tag,
    }).catch(() => {})
  }
}

export async function get_all_tagged_users(guild_id: string): Promise<server_tag_user[]> {
  try {
    const users = await db.find_many<server_tag_user>(COLLECTION, { guild_id })
    return users.sort((a, b) => b.added_at - a.added_at)
  } catch (error) {
    console.error("[ - SERVER TAG - ] Failed to get tagged users:", error)
    return []
  }
}
