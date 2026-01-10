import { Client, GuildMember } from "discord.js"
import { log_error } from "../../shared/utils/error_logger"

const TARGET_BIO_TEXT = "https://discord.gg/getsades"
const REWARD_ROLES    = ["1459692495838384271"]

/**
 * @description Check if user bio contains target text and add roles
 * @param {GuildMember} member - Guild member to check
 * @returns {Promise<boolean>} - Returns true if roles added
 */
export async function check_bio_and_add_roles(member: GuildMember): Promise<boolean> {
  try {
    // - FETCH USER PROFILE - \\
    const user = await member.client.users.fetch(member.id, { force: true })
    
    // - GET BIO FROM USER - \\
    // Note: Bio requires fetching via REST API or accessing user.bio if available
    // Discord.js may not expose bio directly, need to use REST API
    
    const bio = await get_user_bio(member.client, member.id)
    
    if (!bio) {
      console.log(`[ - BIO CHECKER - ] No bio found for ${member.id}`)
      return false
    }
    
    // - CHECK IF BIO CONTAINS TARGET TEXT - \\
    if (bio.toLowerCase().includes(TARGET_BIO_TEXT.toLowerCase())) {
      console.log(`[ - BIO CHECKER - ] Found target in bio for ${member.id}`)
      
      // - ADD ROLES - \\
      for (const role_id of REWARD_ROLES) {
        if (!member.roles.cache.has(role_id)) {
          await member.roles.add(role_id)
          console.log(`[ - BIO CHECKER - ] Added role ${role_id} to ${member.id}`)
        }
      }
      
      return true
    }
    
    return false
  } catch (error) {
    console.error(`[ - BIO CHECKER - ] Error checking bio for ${member.id}:`, error)
    await log_error(member.client, error as Error, "bio_role_checker", {
      user_id : member.id,
      guild_id: member.guild.id,
    })
    return false
  }
}

/**
 * @description Get user bio via REST API
 * @param {Client} client - Discord client
 * @param {string} user_id - User ID
 * @returns {Promise<string | null>} - User bio or null
 */
async function get_user_bio(client: Client, user_id: string): Promise<string | null> {
  try {
    // - USE REST API TO GET USER PROFILE - \\
    const response = await client.rest.get(`/users/${user_id}/profile`) as any
    
    // - BIO IS IN 'bio' OR 'legacy_username' FIELD - \\
    // Note: Discord API structure may vary, check actual response
    return response?.bio || response?.user?.bio || null
  } catch (error) {
    console.error(`[ - BIO CHECKER - ] Failed to fetch bio for ${user_id}:`, error)
    return null
  }
}

/**
 * @description Check all members in guild for bio compliance
 * @param {Client} client - Discord client
 * @param {string} guild_id - Guild ID
 * @returns {Promise<number>} - Number of members with roles added
 */
export async function bulk_check_bios(client: Client, guild_id: string): Promise<number> {
  try {
    const guild = client.guilds.cache.get(guild_id)
    if (!guild) return 0
    
    const members     = await guild.members.fetch()
    let roles_added = 0
    
    for (const [_, member] of members) {
      const added = await check_bio_and_add_roles(member)
      if (added) roles_added++
      
      // - RATE LIMIT PROTECTION - \\
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`[ - BIO CHECKER - ] Bulk check complete: ${roles_added} members received roles`)
    return roles_added
  } catch (error) {
    console.error(`[ - BIO CHECKER - ] Bulk check failed:`, error)
    await log_error(client, error as Error, "bulk_bio_check", {
      guild_id,
    })
    return 0
  }
}
