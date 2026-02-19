import { Client, User, PartialUser } from "discord.js"
import { db, component }             from "../../utils"
import { log_error }                 from "../../utils/error_logger"
import {
  add_quarantine,
  remove_quarantine,
  get_quarantine,
  is_quarantined,
}                                    from "../managers/quarantine_manager"

interface server_tag_user {
  user_id    : string
  guild_id   : string
  username   : string
  tag        : string
  added_at   : number
}

const __collection              = "server_tag_users"
const __target_guild_id         = "1250337227582472243"
const __server_tag_log_id       = "1457105102044139597"
const __quarantine_role_id      = "1265318689130024992"
const __auto_tag_quarantine_by  = "AUTO_TAG_GUARD"

// - TAGS THAT TRIGGER AUTO-QUARANTINE - \\
const __banned_tags = new Set(["LYNX", "ENVY", "ʟʏɴx", "HAJI"])

/**
 * @description Auto-quarantine member when they equip a banned server tag, release when removed
 * @param client   - Discord Client
 * @param new_user - Updated user
 * @param new_tag  - Current primary guild tag (from Gateway event)
 */
async function handle_banned_tag_quarantine(
  client   : Client,
  new_user : User,
  new_tag  : string | null | undefined,
): Promise<void> {
  const guild = client.guilds.cache.get(__target_guild_id)
  if (!guild) return

  const member = await guild.members.fetch(new_user.id).catch(() => null)
  if (!member) return

  const is_using_banned_tag = new_tag ? __banned_tags.has(new_tag) : false

  if (is_using_banned_tag) {
    // - ALREADY QUARANTINED, SKIP - \\
    const already = await is_quarantined(new_user.id, guild.id)
    if (already) return

    const quarantine_role = guild.roles.cache.get(__quarantine_role_id) ||
                            await guild.roles.fetch(__quarantine_role_id).catch(() => null)
    if (!quarantine_role) {
      console.error("[ - SERVER TAG GUARD - ] Quarantine role not found")
      return
    }

    const previous_roles = member.roles.cache
      .filter(r => r.id !== guild.id)
      .map(r => r.id)

    await member.roles.set([quarantine_role.id], `Auto-quarantined: banned server tag ${new_tag}`)

    await add_quarantine(
      new_user.id,
      guild.id,
      quarantine_role.id,
      previous_roles,
      `Auto-quarantined: using banned server tag (${new_tag})`,
      __auto_tag_quarantine_by,
      3650
    )

    console.log(`[ - SERVER TAG GUARD - ] Quarantined ${new_user.username} for tag: ${new_tag}`)

    const log_channel = guild.channels.cache.get(__server_tag_log_id)
    if (log_channel?.isTextBased()) {
      const log_msg = component.build_message({
        components: [
          component.container({
            accent_color : 0xED4245,
            components   : [
              component.section({
                content   : [
                  `## Auto Quarantine - Banned Server Tag`,
                  `<@${new_user.id}> was automatically quarantined`,
                  ``,
                  `Tag: **${new_tag}**`,
                ],
                thumbnail : new_user.displayAvatarURL({ size: 256 }),
              }),
            ],
          }),
        ],
      })
      await log_channel.send(log_msg).catch(() => {})
    }
    return
  }

  // - NOT USING BANNED TAG — CHECK IF AUTO-QUARANTINE SHOULD BE LIFTED - \\
  const quarantine_data = await get_quarantine(new_user.id, guild.id)
  if (!quarantine_data || quarantine_data.quarantined_by !== __auto_tag_quarantine_by) return

  const valid_roles = quarantine_data.previous_roles.filter(rid => guild.roles.cache.has(rid))
  await member.roles.set(valid_roles, "Auto-released: no longer using banned server tag")
  await remove_quarantine(new_user.id, guild.id)

  console.log(`[ - SERVER TAG GUARD - ] Released ${new_user.username} (removed banned tag)`)

  const log_channel = guild.channels.cache.get(__server_tag_log_id)
  if (log_channel?.isTextBased()) {
    const log_msg = component.build_message({
      components: [
        component.container({
          accent_color : 0x57F287,
          components   : [
            component.section({
              content   : [
                `## Auto Release - Banned Server Tag Removed`,
                `<@${new_user.id}> was automatically released from quarantine`,
              ],
              thumbnail : new_user.displayAvatarURL({ size: 256 }),
            }),
          ],
        }),
      ],
    })
    await log_channel.send(log_msg).catch(() => {})
  }
}

export async function check_server_tag_change(
  client   : Client,
  old_user : User | PartialUser,
  new_user : User
): Promise<void> {
  try {
    if (old_user.partial) {
      old_user = await old_user.fetch().catch(() => old_user as User)
    }
    
    console.log(`[ - SERVER TAG - ] Checking user: ${new_user.username} AsyncID: ${new_user.id}`)
    console.log(`[ - SERVER TAG - ] Old tag: ${old_user.primaryGuild?.tag}, Old guild: ${old_user.primaryGuild?.identityGuildId}`)
    console.log(`[ - SERVER TAG - ] New tag: ${new_user.primaryGuild?.tag}, New guild: ${new_user.primaryGuild?.identityGuildId}`)
    
    const old_tag = old_user.primaryGuild?.tag
    const new_tag = new_user.primaryGuild?.tag

    const old_guild_id = old_user.primaryGuild?.identityGuildId
    const new_guild_id = new_user.primaryGuild?.identityGuildId

    // - CHECK IF BANNED TAG WAS EQUIPPED OR REMOVED - \\
    await handle_banned_tag_quarantine(client, new_user, new_tag)

    const switched_to_target_guild = (old_guild_id !== __target_guild_id || !old_tag) && new_tag && new_guild_id === __target_guild_id
    
    if (switched_to_target_guild) {
      console.log(`[ - SERVER TAG - ] User ${new_user.username} added server tag: ${new_tag}`)
      
      const existing = await db.find_one<server_tag_user>(__collection, {
        user_id  : new_user.id,
        guild_id : __target_guild_id,
      })
      
      if (!existing) {
        const tag_data: server_tag_user = {
          user_id  : new_user.id,
          guild_id : __target_guild_id,
          username : new_user.username,
          tag      : new_tag,
          added_at : Math.floor(Date.now() / 1000),
        }
        
        await db.insert_one(__collection, tag_data)
        
        const guild = client.guilds.cache.get(__target_guild_id)
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
        
        const dm_result = await new_user.send(dm_message).catch((error) => {
          console.error(`[ - SERVER TAG - ] Could not DM user ${new_user.username}:`, error)
          return null
        })
        
        if (dm_result) {
          console.log(`[ - SERVER TAG - ] DM sent successfully to ${new_user.username}`)
        }
        
        const log_channel = guild?.channels.cache.get(__server_tag_log_id)
        if (log_channel?.isTextBased()) {
          const log_message = component.build_message({
            components: [
              component.container({
                accent_color: 0x57F287,
                components: [
                  component.section({
                    content: [
                      `## Thank You for Using ATMC Tag`,
                      `<@${new_user.id}> is now representing ATMC with the server tag`,
                      ``,
                      `We appreciate your support`,
                    ],
                    thumbnail: new_user.displayAvatarURL({ size: 256 }),
                  }),
                ],
              }),
            ],
          })

          await log_channel.send(log_message).catch((error) => {
            console.error(`[ - SERVER TAG - ] Failed to send log message:`, error)
          })
        }
        
        console.log(`[ - SERVER TAG - ] Saved to database: ${new_user.username}`)
      } else {
        console.log(`[ - SERVER TAG - ] User ${new_user.username} already in database`)
      }
    }
    
    if (old_tag && old_guild_id === __target_guild_id && (!new_tag || new_guild_id !== __target_guild_id)) {
      await db.delete_one(__collection, {
        user_id  : new_user.id,
        guild_id : __target_guild_id,
      })
      
      console.log(`[ - SERVER TAG - ] User ${new_user.username} removed server tag`)
    }
  } catch (error) {
    console.error(`[ - SERVER TAG - ] Error:`, error)
    await log_error(client, error as Error, "Server Tag Checker", {
      user       : new_user.tag,
      new_tag    : new_user.primaryGuild?.tag || "none",
      new_guild  : new_user.primaryGuild?.identityGuildId || "none",
    }).catch(() => {})
  }
}

export async function get_all_tagged_users(guild_id: string): Promise<server_tag_user[]> {
  try {
    const users = await db.find_many<server_tag_user>(__collection, { guild_id })
    return users.sort((a, b) => b.added_at - a.added_at)
  } catch (error) {
    console.error("[ - SERVER TAG - ] Failed to get tagged users:", error)
    return []
  }
}

export async function sync_guild_tagged_users(client: Client, guild_id: string): Promise<number> {
  try {
    const guild = client.guilds.cache.get(guild_id)
    if (!guild) {
      console.error("[ - SERVER TAG - ] Guild not found")
      return 0
    }

    console.log(`[ - SERVER TAG - ] Starting sync for guild: ${guild.name}`)
    
    await guild.members.fetch()
    
    let synced_count = 0
    
    for (const [member_id, member] of guild.members.cache) {
      try {
        const user = member.user
        
        if (user.primaryGuild?.tag && user.primaryGuild.identityGuildId === guild_id) {
          const existing = await db.find_one<server_tag_user>(__collection, {
            user_id  : user.id,
            guild_id : guild_id,
          })
          
          if (!existing) {
            const tag_data: server_tag_user = {
              user_id  : user.id,
              guild_id : guild_id,
              username : user.username,
              tag      : user.primaryGuild.tag,
              added_at : Date.now(),
            }
            
            await db.insert_one(__collection, tag_data)
            synced_count++
            console.log(`[ - SERVER TAG - ] Synced: ${user.username} - ${user.primaryGuild.tag}`)
          }
        }
      } catch (error) {
        console.error(`[ - SERVER TAG - ] Error syncing member ${member_id}:`, error)
      }
    }
    
    console.log(`[ - SERVER TAG - ] Sync complete. Total synced: ${synced_count}`)
    return synced_count
  } catch (error) {
    console.error("[ - SERVER TAG - ] Failed to sync guild tagged users:", error)
    return 0
  }
}
