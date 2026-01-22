import {
  Guild,
  GuildMember,
  VoiceChannel,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
  CategoryChannel,
  OverwriteType,
  VideoQualityMode,
}                         from "discord.js"
import { logger, component, api, db } from "../../utils"
import { load_config }    from "../../config/loader"
import * as voice_tracker from "../trackers/voice_time_tracker"

interface tempvoice_config {
  category_name         : string
  generator_name        : string
  generator_channel_id? : string
  category_id?          : string
}

interface saved_channel_settings {
  name                    : string
  user_limit              : number
  is_private              : boolean
  trusted_users           : string[]
  blocked_users           : string[]
  owner_permissions?      : string[]
}

const __log    = logger.create_logger("tempvoice")
const __config = load_config<tempvoice_config>("tempvoice")

const __category_name       = __config.category_name  ?? "Temp Voice"
const __generator_name      = __config.generator_name ?? "➕ Create Voice"
const __thread_parent_id    = "1449863232071401534"

const emoji = {
  name         : { id: "1449851618295283763", name: "name"         },
  limit        : { id: "1449851533033214063", name: "limit"        },
  privacy      : { id: "1449851430637797616", name: "privacy"      },
  waiting_room : { id: "1449851292896858132", name: "waiting_room" },
  chat         : { id: "1449851153289576519", name: "chat"         },
  trust        : { id: "1449851587152449746", name: "trust"        },
  untrust      : { id: "1449851506550509730", name: "untrust"      },
  invite       : { id: "1449851345405218997", name: "invite"       },
  kick         : { id: "1449851225427148860", name: "kick"         },
  region       : { id: "1449851128295456918", name: "region"       },
  block        : { id: "1449851559591809104", name: "block"        },
  unblock      : { id: "1449851467304534017", name: "unblock"      },
  claim        : { id: "1449851319350333613", name: "claim"        },
  transfer     : { id: "1449851186772578315", name: "transfer"     },
  delete       : { id: "1449851060922355824", name: "delete"       },
  leaderboard  : { id: "1457012485281546260", name: "leaderboard"  },
}

const __temp_channels: Map<string, string>              = new Map()
const __channel_owners: Map<string, string>             = new Map()
const __trusted_users: Map<string, Set<string>>         = new Map()
const __blocked_users: Map<string, Set<string>>         = new Map()
const __waiting_rooms: Map<string, boolean>             = new Map()
const __threads: Map<string, string>                    = new Map()
const __in_voice_interfaces: Map<string, string>        = new Map()
const __saved_settings: Map<string, saved_channel_settings> = new Map()

let __generator_channel_id : string | null = __config.generator_channel_id || null
let __category_id          : string | null = __config.category_id || null
let __interface_channel_id : string | null = null

function get_category_from_generator(guild: Guild): CategoryChannel | null {
  if (__category_id) {
    const category = guild.channels.cache.get(__category_id) as CategoryChannel
    if (category) return category
  }

  if (__generator_channel_id) {
    const generator = guild.channels.cache.get(__generator_channel_id) as VoiceChannel
    if (generator && generator.parentId) {
      const category = guild.channels.cache.get(generator.parentId) as CategoryChannel
      if (category) {
        __category_id = generator.parentId
        return category
      }
    }
  }

  return null
}

function get_owner_id_from_overwrites(channel: VoiceChannel): string | null {
  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (overwrite.type !== OverwriteType.Member) continue

    const allow = overwrite.allow
    if (
      allow.has(PermissionFlagsBits.ManageChannels) ||
      allow.has(PermissionFlagsBits.MoveMembers)   ||
      allow.has(PermissionFlagsBits.MuteMembers)   ||
      allow.has(PermissionFlagsBits.DeafenMembers)
    ) {
      return overwrite.id
    }
  }

  return null
}

function register_existing_channel(channel: VoiceChannel, owner_id: string): void {
  __temp_channels.set(channel.id, owner_id)
  __channel_owners.set(channel.id, owner_id)
  __trusted_users.set(channel.id, __trusted_users.get(channel.id) || new Set())
  __blocked_users.set(channel.id, __blocked_users.get(channel.id) || new Set())
  __waiting_rooms.set(channel.id, __waiting_rooms.get(channel.id) || false)
}

export async function reconcile_tempvoice_guild(guild: Guild): Promise<void> {
  try {
    const category = get_category_from_generator(guild)
    if (!category) return

    const voice_channels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildVoice &&
      c.parentId === category.id &&
      c.id !== __generator_channel_id
    )

    for (const ch of voice_channels.values()) {
      const channel = ch as VoiceChannel

      if (channel.members.size === 0) {
        await channel.delete().catch(() => {})
        cleanup_channel_data(channel.id)
        continue
      }

      const owner_id = get_owner_id_from_overwrites(channel)
      if (owner_id) {
        register_existing_channel(channel, owner_id)
      }
    }
  } catch (error) {
    __log.error("Failed to reconcile tempvoice guild:", error)
  }
}

interface setup_result {
  success             : boolean
  error?              : string
  category_name?      : string
  generator_name?     : string
  interface_channel_id? : string
}

export async function setup_tempvoice(guild: Guild): Promise<setup_result> {
  try {
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === __category_name
    ) as CategoryChannel | undefined

    if (!category) {
      category = await guild.channels.create({
        name : __category_name,
        type : ChannelType.GuildCategory,
      })
      __log.info(`Created category: ${category.name}`)
    }

    __category_id = category.id

    let interface_channel = guild.channels.cache.find(
      c => c.type === ChannelType.GuildText &&
           c.parentId === category!.id &&
           c.name === "🔊・voice-interface"
    )

    if (!interface_channel) {
      interface_channel = await guild.channels.create({
        name                 : "🔊・voice-interface",
        type                 : ChannelType.GuildText,
        parent               : category.id,
        permissionOverwrites : [
          {
            id   : guild.roles.everyone.id,
            deny : [PermissionFlagsBits.SendMessages],
          },
        ],
      })
      __log.info(`Created interface channel: ${interface_channel.name}`)
    }

    __interface_channel_id = interface_channel.id

    let generator = guild.channels.cache.find(
      c => c.type === ChannelType.GuildVoice &&
           c.parentId === category!.id &&
           c.name === __generator_name
    ) as VoiceChannel | undefined

    if (!generator) {
      generator = await guild.channels.create({
        name    : __generator_name,
        type    : ChannelType.GuildVoice,
        parent  : category.id,
        bitrate : 96000,
      })
      __log.info(`Created generator channel: ${generator.name}`)
    }

    __generator_channel_id = generator.id

    return {
      success              : true,
      category_name        : category.name,
      generator_name       : generator.name,
      interface_channel_id : interface_channel.id,
    }
  } catch (error) {
    __log.error("Failed to setup TempVoice:", error)
    return {
      success : false,
      error   : String(error),
    }
  }
}

export function get_generator_channel_id(): string | null {
  return __generator_channel_id
}

export function set_generator_channel_id(id: string): void {
  __generator_channel_id = id
}

export function get_category_id(): string | null {
  return __category_id
}

export function set_category_id(id: string): void {
  __category_id = id
}

export function get_user_temp_channel(guild: Guild, user_id: string): VoiceChannel | null {
  for (const [channel_id, owner_id] of __channel_owners.entries()) {
    if (owner_id === user_id) {
      const channel = guild.channels.cache.get(channel_id) as VoiceChannel
      if (channel) return channel
    }
  }

  const category = get_category_from_generator(guild)
  if (!category) return null

  for (const ch of guild.channels.cache.values()) {
    if (ch.type !== ChannelType.GuildVoice) continue
    if (ch.parentId !== category.id) continue
    if (ch.id === __generator_channel_id) continue

    const channel  = ch as VoiceChannel
    const owner_id = get_owner_id_from_overwrites(channel)
    if (owner_id === user_id) {
      register_existing_channel(channel, user_id)
      return channel
    }
  }

  return null
}

export async function create_temp_channel(member: GuildMember): Promise<VoiceChannel | null> {
  try {
    const guild = member.guild

    let category: CategoryChannel | null = null

    if (__category_id) {
      category = guild.channels.cache.get(__category_id) as CategoryChannel
    }

    if (!category && __generator_channel_id) {
      const generator = guild.channels.cache.get(__generator_channel_id) as VoiceChannel
      if (generator && generator.parentId) {
        category       = guild.channels.cache.get(generator.parentId) as CategoryChannel
        __category_id  = generator.parentId
      }
    }

    if (!category) {
      __log.error("Category not found")
      return null
    }

    const existing_channel = get_user_temp_channel(guild, member.id)
    if (existing_channel) {
      __log.info(`User ${member.displayName} already has channel, moving to existing: ${existing_channel.name}`)
      try {
        await member.voice.setChannel(existing_channel)
      } catch (err) {
        __log.error("Failed to move member to existing channel:", err)
      }
      return existing_channel
    }

    const channel_name = `${member.displayName}'s Channel`

    const channel = await guild.channels.create({
      name                 : channel_name,
      type                 : ChannelType.GuildVoice,
      parent               : category.id,
      bitrate              : 96000,
      videoQualityMode     : VideoQualityMode.Auto,
      permissionOverwrites : [
        {
          id    : guild.roles.everyone.id,
          type  : OverwriteType.Role,
          allow : [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.UseVAD,
          ],
        },
        {
          id    : member.id,
          type  : OverwriteType.Member,
          allow : [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.UseVAD,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ],
        },
      ],
    })

    __temp_channels.set(channel.id, member.id)
    __channel_owners.set(channel.id, member.id)
    __trusted_users.set(channel.id, new Set())
    __blocked_users.set(channel.id, new Set())
    __waiting_rooms.set(channel.id, false)

    await voice_tracker.track_channel_created(channel.id, member.id, guild.id)

    const has_saved_settings = __saved_settings.has(member.id)
    if (has_saved_settings) {
      await restore_channel_settings(channel, member)
      __log.info(`[ - AUTO RESTORED - ] Settings applied for ${member.displayName}`)
    }

    __log.info(`Created temp channel: ${channel.name} for ${member.displayName}`)

    try {
      await member.voice.setChannel(channel)
      __log.info(`Moved ${member.displayName} to channel: ${channel.name}`)
    } catch (err) {
      __log.error(`Failed to move ${member.displayName} to channel:`, err)
    }

    console.log(`[ - TEMPVOICE - ] Creating thread for ${channel.name}...`)
    const thread_id = await create_thread(channel, member)
    if (thread_id) {
      console.log(`[ - TEMPVOICE - ] Thread created: ${thread_id}`)
    } else {
      console.log(`[ - TEMPVOICE - ] Failed to create thread`)
    }

    return channel
  } catch (error) {
    __log.error("Failed to create temp channel:", error)
    return null
  }
}

export async function delete_temp_channel(channel: VoiceChannel | string): Promise<boolean> {
  try {
    let voice_channel: VoiceChannel | undefined
    let channel_id: string

    if (typeof channel === "string") {
      channel_id = channel
      return false
    } else {
      voice_channel = channel
      channel_id    = channel.id
    }

    const thread_id = __threads.get(channel_id)
    if (thread_id && voice_channel) {
      const thread = voice_channel.guild.channels.cache.get(thread_id)
      if (thread && thread.isThread()) {
        try {
          await thread.setLocked(true)
          await thread.setArchived(true)
          console.log(`[ - THREAD - ] Locked and archived thread ${thread_id}`)
        } catch (thread_error) {
          console.error(`[ - THREAD - ] Failed to lock/archive thread:`, thread_error)
        }
      }
      __threads.delete(channel_id)
    }

    await voice_tracker.track_channel_deleted(channel_id)
    await voice_channel.delete()

    __temp_channels.delete(channel_id)
    __channel_owners.delete(channel_id)
    __trusted_users.delete(channel_id)
    __blocked_users.delete(channel_id)
    __waiting_rooms.delete(channel_id)

    __log.info(`Deleted temp channel: ${channel_id}`)
    return true
  } catch (error) {
    __log.error("Failed to delete temp channel:", error)
    return false
  }
}

export function cleanup_channel_data(channel_id: string): void {
  __temp_channels.delete(channel_id)
  __channel_owners.delete(channel_id)
  __trusted_users.delete(channel_id)
  __blocked_users.delete(channel_id)
  __waiting_rooms.delete(channel_id)
  __threads.delete(channel_id)
  __in_voice_interfaces.delete(channel_id)
}

export function is_temp_channel(channel_id: string): boolean {
  return __temp_channels.has(channel_id)
}

export function is_channel_owner(channel_id: string, user_id: string): boolean {
  return __channel_owners.get(channel_id) === user_id
}

export function get_channel_owner(channel_id: string): string | null {
  return __channel_owners.get(channel_id) || null
}

export async function rename_tempvoice_channel(channel: VoiceChannel, new_name: string): Promise<boolean> {
  try {
    await channel.setName(new_name)
    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }
    return true
  } catch (error) {
    __log.error("Failed to rename channel:", error)
    return false
  }
}

export async function set_user_limit(channel: VoiceChannel, limit: number): Promise<boolean> {
  try {
    await channel.setUserLimit(limit)
    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }
    return true
  } catch (error) {
    __log.error("Failed to set user limit:", error)
    return false
  }
}

export async function set_privacy(channel: VoiceChannel, is_private: boolean): Promise<boolean> {
  try {
    if (is_private) {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Connect: false,
      })
    } else {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Connect: null,
      })
    }
    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }
    return true
  } catch (error) {
    __log.error("Failed to set privacy:", error)
    return false
  }
}

export async function toggle_waiting_room(channel: VoiceChannel): Promise<boolean> {
  const current = __waiting_rooms.get(channel.id) || false
  __waiting_rooms.set(channel.id, !current)
  return !current
}

export function is_waiting_room_enabled(channel_id: string): boolean {
  return __waiting_rooms.get(channel_id) || false
}

/**
 * - CREATE THREAD FOR VOICE CHANNEL - \\
 * @param channel - Voice channel to create thread for
 * @param owner - Owner of the voice channel
 * @returns Thread ID or null
 */
export async function create_thread(channel: VoiceChannel, owner: GuildMember): Promise<string | null> {
  try {
    console.log(`[ - THREAD - ] Starting creation for voice channel ${channel.id}`)
    
    if (__threads.has(channel.id)) {
      console.log(`[ - THREAD - ] Already exists, returning cached ID`)
      return __threads.get(channel.id) || null
    }

    const parent_channel = channel.guild.channels.cache.get(__thread_parent_id)
    if (!parent_channel || parent_channel.type !== ChannelType.GuildText) {
      console.error(`[ - THREAD - ] Parent channel ${__thread_parent_id} not found or not a text channel`)
      return null
    }

    console.log(`[ - THREAD - ] Creating private thread in parent ${__thread_parent_id}...`)
    
    const thread = await parent_channel.threads.create({
      name               : `${channel.name}`,
      type               : ChannelType.PrivateThread,
      autoArchiveDuration: 60,
      reason             : `Voice channel thread for ${owner.displayName}`,
    })

    console.log(`[ - THREAD - ] Created: ${thread.name} (${thread.id})`)
    
    await thread.members.add(owner.id)
    console.log(`[ - THREAD - ] Added owner to thread`)
    
    try {
      const starter_message = await thread.fetchStarterMessage()
      if (starter_message) {
        await starter_message.delete()
        console.log(`[ - THREAD - ] Deleted starter message`)
      }
    } catch (delete_error) {
      console.warn(`[ - THREAD - ] Failed to delete starter message:`, delete_error)
    }
    
    __threads.set(channel.id, thread.id)

    console.log(`[ - THREAD - ] Now creating interface...`)
    const interface_id = await create_in_voice_interface(channel, owner)
    if (interface_id) {
      console.log(`[ - INTERFACE - ] Created successfully: ${interface_id}`)
    } else {
      console.error(`[ - INTERFACE - ] Failed to create interface`)
    }

    return thread.id
  } catch (error) {
    console.error("[ - THREAD - ] Failed to create thread:", error)
    return null
  }
}

/**
 * - DELETE THREAD FOR VOICE CHANNEL - \\
 * @param voice_channel_id - Voice channel ID
 * @returns True if deleted successfully
 */
export async function delete_thread(voice_channel_id: string): Promise<boolean> {
  try {
    const thread_id = __threads.get(voice_channel_id)
    if (!thread_id) return false

    await delete_in_voice_interface(voice_channel_id)

    __threads.delete(voice_channel_id)
    return true
  } catch (error) {
    console.error("[ - THREAD - ] Failed to delete thread:", error)
    return false
  }
}

/**
 * - GET THREAD ID FOR VOICE CHANNEL - \\
 * @param voice_channel_id - Voice channel ID
 * @returns Thread ID or null
 */
export function get_thread_id(voice_channel_id: string): string | null {
  return __threads.get(voice_channel_id) || null
}

export async function trust_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const trusted = __trusted_users.get(channel.id) || new Set()
    trusted.add(user_id)
    __trusted_users.set(channel.id, trusted)

    await channel.permissionOverwrites.edit(user_id, {
      ViewChannel : true,
      Connect     : true,
      Speak       : true,
      UseVAD      : true,
    })

    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }

    return true
  } catch (error) {
    __log.error("Failed to trust user:", error)
    return false
  }
}

export async function untrust_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const trusted = __trusted_users.get(channel.id)
    if (trusted) {
      trusted.delete(user_id)
    }

    await channel.permissionOverwrites.delete(user_id)
    
    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }
    
    return true
  } catch (error) {
    __log.error("Failed to untrust user:", error)
    return false
  }
}

export function get_trusted_users(channel_id: string): Set<string> {
  return __trusted_users.get(channel_id) || new Set()
}

export async function block_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const blocked = __blocked_users.get(channel.id) || new Set()
    blocked.add(user_id)
    __blocked_users.set(channel.id, blocked)

    await channel.permissionOverwrites.edit(user_id, {
      Connect : false,
      Speak   : false,
    })

    const member = channel.guild.members.cache.get(user_id)
    if (member && member.voice.channelId === channel.id) {
      await member.voice.disconnect()
    }

    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }

    return true
  } catch (error) {
    __log.error("Failed to block user:", error)
    return false
  }
}

export async function unblock_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const blocked = __blocked_users.get(channel.id)
    if (blocked) {
      blocked.delete(user_id)
    }

    await channel.permissionOverwrites.delete(user_id)
    
    const owner_id = get_channel_owner(channel.id)
    if (owner_id) {
      save_channel_settings(channel, owner_id)
    }
    
    return true
  } catch (error) {
    __log.error("Failed to unblock user:", error)
    return false
  }
}

export function get_blocked_users(channel_id: string): Set<string> {
  return __blocked_users.get(channel_id) || new Set()
}

export async function kick_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const member = channel.guild.members.cache.get(user_id)
    if (!member || member.voice.channelId !== channel.id) {
      return false
    }

    await member.voice.disconnect()
    return true
  } catch (error) {
    __log.error("Failed to kick user:", error)
    return false
  }
}

export async function invite_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    await channel.permissionOverwrites.edit(user_id, {
      ViewChannel : true,
      Connect     : true,
      UseVAD      : true,
    })

    try {
      const user = await channel.guild.members.fetch(user_id)
      if (user) {
        const dm_channel = await user.createDM()
        
        const invite_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `## <:unblock:1449851467304534017> Voice Channel Invitation`,
                  `You've been invited to join **${channel.name}**!`,
                ]),
                component.divider(2),
                component.action_row(
                  component.link_button("Join Voice", `https://discord.com/channels/${channel.guild.id}/${channel.id}`)
                ),
              ],
            }),
          ],
        })

        await api.send_components_v2(dm_channel.id, api.get_token(), { ...invite_message, flags: 32768 })
      }
    } catch (dm_error) {
      __log.warn(`Failed to send invite DM to user ${user_id}:`, dm_error)
    }

    return true
  } catch (error) {
    __log.error("Failed to invite user:", error)
    return false
  }
}

export async function set_region(channel: VoiceChannel, region: string | null): Promise<boolean> {
  try {
    await channel.setRTCRegion(region)
    return true
  } catch (error) {
    __log.error("Failed to set region:", error)
    return false
  }
}

export async function claim_channel(channel: VoiceChannel, new_owner: GuildMember): Promise<boolean> {
  try {
    const current_owner_id = __channel_owners.get(channel.id)
    if (!current_owner_id) return false

    const current_owner = channel.guild.members.cache.get(current_owner_id)
    if (current_owner && current_owner.voice.channelId === channel.id) {
      return false
    }

    __channel_owners.set(channel.id, new_owner.id)

    await channel.permissionOverwrites.edit(new_owner.id, {
      Connect        : true,
      Speak          : true,
      ManageChannels : true,
      MoveMembers    : true,
      MuteMembers    : true,
      DeafenMembers  : true,
    })

    if (current_owner_id) {
      await channel.permissionOverwrites.delete(current_owner_id)
    }

    return true
  } catch (error) {
    __log.error("Failed to claim channel:", error)
    return false
  }
}

export async function transfer_ownership(channel: VoiceChannel, current_owner: GuildMember, new_owner_id: string): Promise<boolean> {
  try {
    if (!is_channel_owner(channel.id, current_owner.id)) {
      return false
    }

    const new_owner = channel.guild.members.cache.get(new_owner_id)
    if (!new_owner) return false

    __channel_owners.set(channel.id, new_owner_id)

    await channel.permissionOverwrites.edit(new_owner_id, {
      Connect        : true,
      Speak          : true,
      ManageChannels : true,
      MoveMembers    : true,
      MuteMembers    : true,
      DeafenMembers  : true,
    })

    await channel.permissionOverwrites.delete(current_owner.id)

    return true
  } catch (error) {
    __log.error("Failed to transfer ownership:", error)
    return false
  }
}

export async function handle_voice_state_update(old_state: VoiceState, new_state: VoiceState): Promise<void> {
  const member = new_state.member || old_state.member
  if (!member) return

  if (new_state.channelId === __generator_channel_id) {
    await create_temp_channel(member)
    return
  }

  // - ADD MEMBER TO THREAD WHEN JOINING TEMP CHANNEL - \\
  if (new_state.channelId && is_temp_channel(new_state.channelId)) {
    const thread_id = __threads.get(new_state.channelId)
    if (thread_id) {
      try {
        const channel = new_state.guild.channels.cache.get(thread_id)
        if (channel && channel.isThread()) {
          await channel.members.add(member.id)
          console.log(`[ - THREAD - ] Added ${member.displayName} to thread`)
        }
      } catch (error) {
        console.error(`[ - THREAD - ] Failed to add member to thread:`, error)
      }
    }
  }

  // - REMOVE MEMBER FROM THREAD WHEN LEAVING TEMP CHANNEL - \\
  if (old_state.channelId && is_temp_channel(old_state.channelId) && old_state.channelId !== new_state.channelId) {
    const thread_id = __threads.get(old_state.channelId)
    if (thread_id) {
      try {
        const channel = old_state.guild.channels.cache.get(thread_id)
        if (channel && channel.isThread()) {
          await channel.members.remove(member.id)
          console.log(`[ - THREAD - ] Removed ${member.displayName} from thread`)
        }
      } catch (error) {
        console.error(`[ - THREAD - ] Failed to remove member from thread:`, error)
      }
    }
  }

  if (old_state.channelId && is_temp_channel(old_state.channelId)) {
    const channel = old_state.channel as VoiceChannel
    if (channel && channel.members.size === 0) {
      __log.info(`Channel empty, deleting immediately: ${old_state.channelId}`)
      await delete_temp_channel(channel)
    }
  }
}

export function get_interface_channel_id(): string | null {
  return __interface_channel_id
}

export function set_interface_channel_id(id: string): void {
  __interface_channel_id = id
}

export function init_from_database(
  generator_id : string,
  category_id  : string,
  channels     : { channel_id: string; owner_id: string }[]
): void {
  __generator_channel_id = generator_id
  __category_id          = category_id

  for (const ch of channels) {
    __temp_channels.set(ch.channel_id, ch.owner_id)
    __channel_owners.set(ch.channel_id, ch.owner_id)
    __trusted_users.set(ch.channel_id, new Set())
    __blocked_users.set(ch.channel_id, new Set())
    __waiting_rooms.set(ch.channel_id, false)
  }
}

/**
 * - CREATE IN-VOICE CHAT INTERFACE - \\
 * @param voice_channel - The voice channel to create interface for
 * @param owner - The owner of the voice channel
 * @returns The interface message ID or null if failed
 */
export async function create_in_voice_interface(voice_channel: VoiceChannel, owner: GuildMember): Promise<string | null> {
  try {
    console.log(`[ - INTERFACE - ] Starting creation for voice channel ${voice_channel.id}`)
    
    if (__in_voice_interfaces.has(voice_channel.id)) {
      console.log(`[ - INTERFACE - ] Already exists, returning cached ID`)
      return __in_voice_interfaces.get(voice_channel.id) || null
    }

    const thread_id = __threads.get(voice_channel.id)
    console.log(`[ - INTERFACE - ] Thread ID from map: ${thread_id}`)
    
    if (!thread_id) {
      console.error(`[ - INTERFACE - ] No thread ID found for voice channel ${voice_channel.id}`)
      return null
    }

    let thread = voice_channel.guild.channels.cache.get(thread_id)
    console.log(`[ - INTERFACE - ] Thread from cache: ${thread ? 'FOUND' : 'NOT FOUND'}`)
    
    if (!thread) {
      console.log(`[ - INTERFACE - ] Thread not in cache, fetching...`)
      try {
        const fetched = await voice_channel.guild.channels.fetch(thread_id)
        if (fetched) {
          thread = fetched
          console.log(`[ - INTERFACE - ] Successfully fetched thread`)
        }
      } catch (fetch_error) {
        console.error(`[ - INTERFACE - ] Failed to fetch thread:`, fetch_error)
        return null
      }
    }

    if (!thread) {
      console.error(`[ - INTERFACE - ] Thread still not found after fetch`)
      return null
    }

    console.log(`[ - INTERFACE - ] Building message for thread ${thread_id}`)

    const interface_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Atomic TempVoice\nThis interface can be used to manage temporary voice channels."),
            component.divider(2),
            component.media_gallery([
              component.gallery_item("https://github.com/bimoraa/atomic_bot/blob/main/assets/interface.png?raw=true"),
            ]),
            component.divider(2),
            component.action_row(
              component.secondary_button("", "tempvoice_name",        emoji.name),
              component.secondary_button("", "tempvoice_limit",       emoji.limit),
              component.secondary_button("", "tempvoice_privacy",     emoji.privacy),
              component.secondary_button("", "tempvoice_waitingroom", emoji.waiting_room),
              component.secondary_button("", "tempvoice_chat",        emoji.chat),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_trust",   emoji.trust),
              component.secondary_button("", "tempvoice_untrust", emoji.untrust),
              component.secondary_button("", "tempvoice_invite",  emoji.invite),
              component.secondary_button("", "tempvoice_kick",    emoji.kick),
              component.secondary_button("", "tempvoice_region",  emoji.region),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_block",       emoji.block),
              component.secondary_button("", "tempvoice_unblock",     emoji.unblock),
              component.secondary_button("", "tempvoice_claim",       emoji.claim),
              component.secondary_button("", "tempvoice_transfer",    emoji.transfer),
              component.danger_button("", "tempvoice_delete",         emoji.delete),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_leaderboard", emoji.leaderboard),
            ),
          ],
        }),
      ],
    })

    console.log(`[ - INTERFACE - ] Sending message to thread ${thread_id}...`)

    const sent_message = await api.send_components_v2(
      thread_id,
      api.get_token(),
      interface_message
    )

    console.log(`[ - INTERFACE - ] API response:`, sent_message)

    if (sent_message && sent_message.id) {
      __in_voice_interfaces.set(voice_channel.id, sent_message.id)
      console.log(`[ - INTERFACE - ] ✓ Successfully sent message ${sent_message.id}`)
      return sent_message.id
    }

    console.error(`[ - INTERFACE - ] ✗ Failed to send message, no ID in response`)
    return null
  } catch (error) {
    console.error("[ - INTERFACE - ] Exception during creation:", error)
    return null
  }
}

/**
 * - DELETE IN-VOICE CHAT INTERFACE - \\
 * @param voice_channel_id - The voice channel ID
 * @returns True if deleted successfully
 */
export async function delete_in_voice_interface(voice_channel_id: string): Promise<boolean> {
  try {
    const message_id = __in_voice_interfaces.get(voice_channel_id)
    if (!message_id) return false

    const thread_id = __threads.get(voice_channel_id)
    if (thread_id) {
      await api.delete_message(thread_id, message_id, api.get_token())
    }

    __in_voice_interfaces.delete(voice_channel_id)
    return true
  } catch (error) {
    console.error("[ - INTERFACE - ] Failed to delete interface:", error)
    return false
  }
}

/**
 * - UPDATE IN-VOICE CHAT INTERFACE - \\
 * @param voice_channel - The voice channel
 * @param owner - The owner of the voice channel
 * @returns True if updated successfully
 */
export async function update_in_voice_interface(voice_channel: VoiceChannel, owner: GuildMember): Promise<boolean> {
  try {
    const message_id = __in_voice_interfaces.get(voice_channel.id)
    if (!message_id) return false

    const thread_id = __threads.get(voice_channel.id)
    if (!thread_id) return false

    const interface_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Voice Channel Controls`,
              `**Owner:** <@${owner.id}>`,
              `**Channel:** ${voice_channel.name}`,
              `**Members:** ${voice_channel.members.size}/${voice_channel.userLimit || "∞"}`,
            ]),
            component.divider(2),
            component.action_row(
              component.secondary_button("", "tempvoice_name",        emoji.name),
              component.secondary_button("", "tempvoice_limit",       emoji.limit),
              component.secondary_button("", "tempvoice_privacy",     emoji.privacy),
              component.secondary_button("", "tempvoice_waitingroom", emoji.waiting_room),
              component.secondary_button("", "tempvoice_chat",        emoji.chat),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_trust",   emoji.trust),
              component.secondary_button("", "tempvoice_untrust", emoji.untrust),
              component.secondary_button("", "tempvoice_invite",  emoji.invite),
              component.secondary_button("", "tempvoice_kick",    emoji.kick),
              component.secondary_button("", "tempvoice_region",  emoji.region),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_block",    emoji.block),
              component.secondary_button("", "tempvoice_unblock",  emoji.unblock),
              component.secondary_button("", "tempvoice_claim",    emoji.claim),
              component.secondary_button("", "tempvoice_transfer", emoji.transfer),
              component.danger_button("", "tempvoice_delete",      emoji.delete),
            ),
          ],
        }),
      ],
    })

    await api.edit_components_v2(
      thread_id,
      message_id,
      api.get_token(),
      interface_message
    )

    return true
  } catch (error) {
    console.error("[ - INTERFACE - ] Failed to update interface:", error)
    return false
  }
}

/**
 * - GET IN-VOICE INTERFACE MESSAGE ID - \\
 * @param voice_channel_id - The voice channel ID
 * @returns The message ID or null
 */
export function get_in_voice_interface_id(voice_channel_id: string): string | null {
  return __in_voice_interfaces.get(voice_channel_id) || null
}

/**
 * - SAVE CHANNEL SETTINGS - \\
 * @param channel - The voice channel
 * @param owner_id - The owner user ID
 */
async function save_channel_settings(channel: VoiceChannel, owner_id: string): Promise<void> {
  try {
    const is_private = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.Connect) || false

    // - GET OWNER PERMISSIONS FROM CHANNEL OVERWRITES - \\
    const owner_overwrite = channel.permissionOverwrites.cache.get(owner_id)
    const owner_permissions: string[] = []
    
    if (owner_overwrite) {
      const allow_perms = owner_overwrite.allow
      if (allow_perms.has(PermissionFlagsBits.ViewChannel))     owner_permissions.push("ViewChannel")
      if (allow_perms.has(PermissionFlagsBits.Connect))         owner_permissions.push("Connect")
      if (allow_perms.has(PermissionFlagsBits.Speak))           owner_permissions.push("Speak")
      if (allow_perms.has(PermissionFlagsBits.UseVAD))          owner_permissions.push("UseVAD")
      if (allow_perms.has(PermissionFlagsBits.ManageChannels))  owner_permissions.push("ManageChannels")
      if (allow_perms.has(PermissionFlagsBits.MoveMembers))     owner_permissions.push("MoveMembers")
      if (allow_perms.has(PermissionFlagsBits.MuteMembers))     owner_permissions.push("MuteMembers")
      if (allow_perms.has(PermissionFlagsBits.DeafenMembers))   owner_permissions.push("DeafenMembers")
    }

    const settings: saved_channel_settings = {
      name              : channel.name,
      user_limit        : channel.userLimit,
      is_private        : is_private,
      trusted_users     : Array.from(__trusted_users.get(channel.id) || []),
      blocked_users     : Array.from(__blocked_users.get(channel.id) || []),
      owner_permissions : owner_permissions,
    }

    __saved_settings.set(owner_id, settings)

    if (db.is_connected()) {
      await db.update_one(
        "tempvoice_saved_settings",
        { user_id: owner_id },
        {
          user_id           : owner_id,
          guild_id          : channel.guild.id,
          name              : settings.name,
          user_limit        : settings.user_limit,
          is_private        : settings.is_private,
          trusted_users     : settings.trusted_users,
          blocked_users     : settings.blocked_users,
          owner_permissions : settings.owner_permissions,
          updated_at        : new Date(),
        },
        true
      )
    }

    __log.info(`[ - SETTINGS SAVED - ] User ${owner_id}: ${channel.name} (${owner_permissions.length} perms)`)
  } catch (error) {
    __log.error("Failed to save channel settings:", error)
  }
}

/**
 * - RESTORE CHANNEL SETTINGS - \\
 * @param channel - The voice channel to restore settings to
 * @param owner - The owner member
 * @returns True if settings were restored
 */
export async function restore_channel_settings(channel: VoiceChannel, owner: GuildMember): Promise<boolean> {
  try {
    const settings = __saved_settings.get(owner.id)
    if (!settings) {
      return false
    }

    await channel.setName(settings.name)
    await channel.setUserLimit(settings.user_limit)

    // - RESTORE OWNER PERMISSIONS - \\
    if (settings.owner_permissions && settings.owner_permissions.length > 0) {
      const permissions_map: { [key: string]: any } = {}
      
      for (const perm of settings.owner_permissions) {
        if (perm === "ViewChannel")    permissions_map.ViewChannel    = true
        if (perm === "Connect")        permissions_map.Connect        = true
        if (perm === "Speak")          permissions_map.Speak          = true
        if (perm === "UseVAD")         permissions_map.UseVAD         = true
        if (perm === "ManageChannels") permissions_map.ManageChannels = true
        if (perm === "MoveMembers")    permissions_map.MoveMembers    = true
        if (perm === "MuteMembers")    permissions_map.MuteMembers    = true
        if (perm === "DeafenMembers")  permissions_map.DeafenMembers  = true
      }
      
      await channel.permissionOverwrites.edit(owner.id, permissions_map)
      __log.info(`[ - PERMISSIONS RESTORED - ] Owner ${owner.id} got ${settings.owner_permissions.length} permissions`)
    }

    if (settings.is_private) {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Connect: false,
      })
    }

    for (const user_id of settings.trusted_users) {
      await channel.permissionOverwrites.edit(user_id, {
        ViewChannel : true,
        Connect     : true,
        Speak       : true,
        UseVAD      : true,
      })
      const trusted = __trusted_users.get(channel.id) || new Set()
      trusted.add(user_id)
      __trusted_users.set(channel.id, trusted)
    }

    for (const user_id of settings.blocked_users) {
      await channel.permissionOverwrites.edit(user_id, {
        Connect : false,
        Speak   : false,
      })
      const blocked = __blocked_users.get(channel.id) || new Set()
      blocked.add(user_id)
      __blocked_users.set(channel.id, blocked)
    }

    __log.info(`[ - SETTINGS RESTORED - ] User ${owner.id}: ${settings.name}`)
    return true
  } catch (error) {
    __log.error("Failed to restore channel settings:", error)
    return false
  }
}

/**
 * - GET SAVED SETTINGS - \\
 * @param user_id - The user ID
 * @returns The saved settings or null
 */
export function get_saved_settings(user_id: string): saved_channel_settings | null {
  return __saved_settings.get(user_id) || null
}

/**
 * - CLEAR SAVED SETTINGS - \\
 * @param user_id - The user ID
 */
export async function clear_saved_settings(user_id: string): Promise<void> {
  __saved_settings.delete(user_id)
  
  if (db.is_connected()) {
    await db.delete_one("tempvoice_saved_settings", { user_id })
  }
  
  __log.info(`[ - SETTINGS CLEARED - ] User ${user_id}`)
}

/**
 * - LOAD SAVED SETTINGS FROM DATABASE - \\
 * @param guild_id - The guild ID to load settings for
 */
export async function load_saved_settings_from_db(guild_id: string): Promise<void> {
  try {
    if (!db.is_connected()) {
      __log.warn("[ - TEMPVOICE - ] Database not connected, skipping settings load")
      return
    }

    const records = await db.find_many<{
      user_id           : string
      name              : string
      user_limit        : number
      is_private        : boolean
      trusted_users     : string[]
      blocked_users     : string[]
      owner_permissions?: string[]
    }>("tempvoice_saved_settings", { guild_id })

    for (const record of records) {
      const settings: saved_channel_settings = {
        name              : record.name,
        user_limit        : record.user_limit,
        is_private        : record.is_private,
        trusted_users     : record.trusted_users || [],
        blocked_users     : record.blocked_users || [],
        owner_permissions : record.owner_permissions || [],
      }
      __saved_settings.set(record.user_id, settings)
    }

    __log.info(`[ - TEMPVOICE - ] Loaded ${records.length} saved settings from database`)
  } catch (error) {
    __log.error("Failed to load saved settings from database:", error)
  }
}
