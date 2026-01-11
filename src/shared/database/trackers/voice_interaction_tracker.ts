import { db } from "../../utils"
import { VoiceChannel } from "discord.js"

interface voice_interaction {
  user_id     : string
  target_id   : string
  guild_id    : string
  action_type : string
  timestamp   : number
}

const COLLECTION            = "voice_interactions"
const INTERACTION_CACHE_TTL = 30 * 24 * 60 * 60 * 1000

/**
 * @param {string} user_id - User who performed action
 * @param {string} target_id - User who received action
 * @param {string} guild_id - Guild ID
 * @param {string} action_type - Type of action (invite, trust, kick, etc)
 * @return {Promise<void>}
 */
export async function track_interaction(
  user_id     : string,
  target_id   : string,
  guild_id    : string,
  action_type : string
): Promise<void> {
  try {
    await db.insert_one<voice_interaction>(COLLECTION, {
      user_id,
      target_id,
      guild_id,
      action_type,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("[ - VOICE INTERACTION TRACKER - ] Error tracking interaction:", error)
  }
}

/**
 * @param {string} user_id - User ID to get suggestions for
 * @param {string} guild_id - Guild ID
 * @param {VoiceChannel} channel - Voice channel to get members from
 * @param {number} limit - Max suggestions to return
 * @return {Promise<string[]>} Array of user IDs sorted by interaction frequency
 */
export async function get_suggested_users(
  user_id  : string,
  guild_id : string,
  channel  : VoiceChannel,
  limit    : number = 25
): Promise<string[]> {
  try {
    const cutoff_time = Date.now() - INTERACTION_CACHE_TTL
    
    const interactions = await db.find_many<voice_interaction>(COLLECTION, {
      user_id,
      guild_id,
    })
    
    const recent_interactions = interactions.filter(i => i.timestamp > cutoff_time)
    
    const interaction_count = new Map<string, number>()
    
    for (const interaction of recent_interactions) {
      const count = interaction_count.get(interaction.target_id) || 0
      interaction_count.set(interaction.target_id, count + 1)
    }
    
    const sorted_users = Array.from(interaction_count.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([target_id]) => target_id)
    
    const current_members = channel.members
      .filter(m => !m.user.bot && m.id !== user_id)
      .map(m => m.id)
    
    const prioritized_users: string[] = []
    const seen_users = new Set<string>()
    
    for (const target_id of sorted_users) {
      if (!seen_users.has(target_id)) {
        prioritized_users.push(target_id)
        seen_users.add(target_id)
      }
    }
    
    for (const member_id of current_members) {
      if (!seen_users.has(member_id)) {
        prioritized_users.push(member_id)
        seen_users.add(member_id)
      }
    }
    
    const all_members = await channel.guild.members.fetch()
    const remaining_members = all_members
      .filter(m => !m.user.bot && m.id !== user_id && !seen_users.has(m.id))
      .map(m => m.id)
    
    prioritized_users.push(...remaining_members)
    
    return prioritized_users.slice(0, limit)
  } catch (error) {
    console.error("[ - VOICE INTERACTION TRACKER - ] Error getting suggestions:", error)
    
    const all_members = await channel.guild.members.fetch()
    return all_members
      .filter(m => !m.user.bot && m.id !== user_id)
      .map(m => m.id)
      .slice(0, limit)
  }
}

/**
 * @param {number} days - Days to keep
 * @return {Promise<void>}
 */
export async function cleanup_old_interactions(days: number = 30): Promise<void> {
  try {
    const cutoff_time = Date.now() - (days * 24 * 60 * 60 * 1000)
    const deleted     = await db.delete_many(COLLECTION, {
      timestamp: { $lt: cutoff_time },
    })
    console.log(`[ - VOICE INTERACTION TRACKER - ] Cleaned up ${deleted} old interactions`)
  } catch (error) {
    console.error("[ - VOICE INTERACTION TRACKER - ] Error cleaning up:", error)
  }
}
