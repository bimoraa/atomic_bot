import { Client }     from "discord.js"
import { db, http }  from "../utils"
import { log_error } from "../utils/error_logger"

interface free_script_user {
  user_id    : string
  guild_id   : string
  username   : string
  user_key   : string
  created_at : number
  has_tag    : boolean
}

const COLLECTION          = "free_script_users"
const TARGET_GUILD_ID     = "1250337227582472243"
const FREE_SCRIPT_ROLE_ID = "1347086323575423048"
const FREE_PROJECT_ID     = "cd7560b7384fd815dafd993828c40d2b"

function get_api_key(): string {
  return process.env.LUARMOR_API_KEY || ""
}

function get_headers(): Record<string, string> {
  return {
    Authorization: get_api_key(),
  }
}

export async function remove_free_script_access(user_id: string): Promise<boolean> {
  try {
    const delete_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users/${user_id}`
    
    await fetch(delete_url, {
      method  : "DELETE",
      headers : get_headers(),
    })
    
    console.log(`[ - FREE SCRIPT - ] Unwhitelist API called for ${user_id}`)

    await db.delete_one(COLLECTION, { user_id })
    
    console.log(`[ - FREE SCRIPT - ] Removed user ${user_id} from database`)
    
    return true
  } catch (error) {
    console.error(`[ - FREE SCRIPT - ] Failed to remove access for ${user_id}:`, error)
    return false
  }
}

export async function check_free_script_users_tags(client: Client): Promise<void> {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID)
    if (!guild) {
      console.error("[ - FREE SCRIPT - ] Guild not found")
      return
    }

    const free_users = await db.find_many<free_script_user>(COLLECTION, { guild_id: TARGET_GUILD_ID })
    
    if (free_users.length === 0) {
      console.log("[ - FREE SCRIPT - ] No free script users to check")
      return
    }

    console.log(`[ - FREE SCRIPT - ] Checking ${free_users.length} users for server tag compliance`)

    let removed_count = 0

    for (const user_data of free_users) {
      try {
        const member = await guild.members.fetch(user_data.user_id).catch(() => null)
        
        if (!member) {
          console.log(`[ - FREE SCRIPT - ] User ${user_data.user_id} not in server, removing access`)
          await remove_free_script_access(user_data.user_id)
          removed_count++
          continue
        }

        const user = member.user
        const has_tag = user.primaryGuild?.tag && user.primaryGuild.identityGuildId === TARGET_GUILD_ID

        if (!has_tag) {
          console.log(`[ - FREE SCRIPT - ] User ${user.username} (${user_data.user_id}) removed server tag, unwhitelisting`)
          
          await remove_free_script_access(user_data.user_id)
          
          if (member.roles.cache.has(FREE_SCRIPT_ROLE_ID)) {
            await member.roles.remove(FREE_SCRIPT_ROLE_ID).catch((error) => {
              console.error(`[ - FREE SCRIPT - ] Failed to remove role from ${user.username}:`, error)
            })
          }

          const dm_message = {
            embeds: [{
              title      : "Free Script Access Removed",
              description: [
                `Your free script access has been removed because you are no longer wearing the ATMC server tag.`,
                ``,
                `**To regain access:**`,
                `1. Set the ATMC server tag in your profile`,
                `2. Click "Get Script" button again`,
              ].join("\n"),
              color: 0xED4245,
            }],
          }

          await user.send(dm_message).catch(() => {
            console.log(`[ - FREE SCRIPT - ] Could not DM user ${user.username}`)
          })

          removed_count++
        } else if (!user_data.has_tag) {
          await db.update_one(
            COLLECTION,
            { user_id: user_data.user_id },
            { has_tag: true }
          )
          console.log(`[ - FREE SCRIPT - ] User ${user.username} tag status updated`)
        }
      } catch (error) {
        console.error(`[ - FREE SCRIPT - ] Error checking user ${user_data.user_id}:`, error)
      }
    }

    console.log(`[ - FREE SCRIPT - ] Check complete. Removed: ${removed_count}`)
  } catch (error) {
    console.error("[ - FREE SCRIPT - ] Failed to check free script users:", error)
    await log_error(client, error as Error, "Free Script Tag Checker", {}).catch(() => {})
  }
}

export async function start_free_script_checker(client: Client): Promise<void> {
  const CHECK_INTERVAL = 30 * 60 * 1000
  
  console.log("[ - FREE SCRIPT - ] Starting free script tag checker (30 min interval)")
  
  setInterval(() => {
    check_free_script_users_tags(client)
  }, CHECK_INTERVAL)
  
  setTimeout(() => {
    check_free_script_users_tags(client)
  }, 60 * 1000)
}

export async function get_all_free_script_users(): Promise<free_script_user[]> {
  try {
    const users = await db.find_many<free_script_user>(COLLECTION, {})
    return users.sort((a, b) => b.created_at - a.created_at)
  } catch (error) {
    console.error("[ - FREE SCRIPT - ] Failed to get free script users:", error)
    return []
  }
}
