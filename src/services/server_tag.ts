import { Client, GuildMember } from "discord.js"
import { db, component }       from "../utils"
import { log_error }           from "../utils/error_logger"

interface server_tag_user {
  user_id    : string
  guild_id   : string
  username   : string
  tag        : string
  added_at   : number
}

const COLLECTION = "server_tag_users"

export async function check_server_tag_change(
  client     : Client,
  old_member : GuildMember,
  new_member : GuildMember
): Promise<void> {
  try {
    const guild_tag = new_member.guild.name.toLowerCase()
    
    const old_display = old_member.displayName.toLowerCase()
    const new_display = new_member.displayName.toLowerCase()
    
    const old_has_tag = old_display.includes(guild_tag) || old_display.includes("atmc")
    const new_has_tag = new_display.includes(guild_tag) || new_display.includes("atmc")
    
    if (!old_has_tag && new_has_tag) {
      const existing = await db.find_one<server_tag_user>(COLLECTION, {
        user_id  : new_member.id,
        guild_id : new_member.guild.id,
      })
      
      if (!existing) {
        const tag_data: server_tag_user = {
          user_id  : new_member.id,
          guild_id : new_member.guild.id,
          username : new_member.user.username,
          tag      : new_display.includes("atmc") ? "atmc" : guild_tag,
          added_at : Date.now(),
        }
        
        await db.insert_one(COLLECTION, tag_data)
        
        const dm_message = component.build_message({
          components: [
            component.container({
              accent_color: 0x5865F2,
              components: [
                component.text([
                  `## Thanks for using our server tag!`,
                  `We appreciate you representing **${new_member.guild.name}** in your profile.`,
                  ``,
                  `You're now part of our tagged community!`,
                ]),
              ],
            }),
          ],
        })
        
        await new_member.send(dm_message).catch(() => {
          console.log(`[ - SERVER TAG - ] Could not DM user ${new_member.user.username}`)
        })
        
        console.log(`[ - SERVER TAG - ] User ${new_member.user.username} added server tag`)
      }
    }
    
    if (old_has_tag && !new_has_tag) {
      await db.delete_one(COLLECTION, {
        user_id  : new_member.id,
        guild_id : new_member.guild.id,
      })
      
      console.log(`[ - SERVER TAG - ] User ${new_member.user.username} removed server tag`)
    }
  } catch (error) {
    await log_error(client, error as Error, "Server Tag Checker", {
      user   : new_member.user.tag,
      guild  : new_member.guild.name,
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
