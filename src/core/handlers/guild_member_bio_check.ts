import { Client, GuildMember } from "discord.js"
import { check_bio_and_add_roles } from "./bio_role_checker"

/**
 * @description Register bio check event handlers
 * @param {Client} client - Discord client
 */
function register_bio_check_handler(client: Client): void {
  // - CHECK BIO ON MEMBER JOIN - \\
  client.on("guildMemberAdd", async (member: GuildMember) => {
    console.log(`[ - BIO CHECKER - ] New member joined: ${member.id}`)
    
    // - WAIT A BIT FOR DISCORD TO SYNC - \\
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await check_bio_and_add_roles(member)
  })
  
  // - CHECK BIO ON MEMBER UPDATE - \\
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    // - ONLY CHECK IF USER DOESN'T HAVE ROLES YET - \\
    const has_roles = newMember.roles.cache.has("1459692495838384271")
    
    if (has_roles) return
    
    console.log(`[ - BIO CHECKER - ] Member updated: ${newMember.id}`)
    await check_bio_and_add_roles(newMember)
  })
  
  // - CHECK BIO ON PRESENCE UPDATE (OPTIONAL) - \\
  client.on("presenceUpdate", async (oldPresence, newPresence) => {
    if (!newPresence?.member) return
    
    const member    = newPresence.member
    const has_roles = member.roles.cache.has("1459692495838384271")
    
    if (has_roles) return
    
    // - CHECK BIO WHEN USER CHANGES STATUS - \\
    await check_bio_and_add_roles(member)
  })
  
  console.log("[ - BIO CHECKER - ] Bio check handlers registered")
}

// - AUTO REGISTER ON IMPORT - \\
import { client } from "../../index"
register_bio_check_handler(client)
