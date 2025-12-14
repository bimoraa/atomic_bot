import {
  Guild,
  GuildMember,
  VoiceChannel,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
  CategoryChannel,
  OverwriteType,
}                      from "discord.js"
import { logger }      from "../utils"
import { load_config } from "../configuration/loader"

interface tempvoice_config {
  category_name  : string
  generator_name : string
}

const __log    = logger.create_logger("tempvoice")
const __config = load_config<tempvoice_config>("tempvoice")

const __category_name  = __config.category_name  ?? "Temp Voice"
const __generator_name = __config.generator_name ?? "➕ Create Voice"

const __temp_channels: Map<string, string>              = new Map()
const __channel_owners: Map<string, string>             = new Map()
const __trusted_users: Map<string, Set<string>>         = new Map()
const __blocked_users: Map<string, Set<string>>         = new Map()
const __waiting_rooms: Map<string, boolean>             = new Map()
const __text_channels: Map<string, string>              = new Map()

let __generator_channel_id : string | null = null
let __category_id          : string | null = null
let __interface_channel_id : string | null = null

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
        name   : __generator_name,
        type   : ChannelType.GuildVoice,
        parent : category.id,
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
      permissionOverwrites : [
        {
          id    : member.id,
          type  : OverwriteType.Member,
          allow : [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
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

    __log.info(`Created temp channel: ${channel.name} for ${member.displayName}`)

    try {
      await member.voice.setChannel(channel)
      __log.info(`Moved ${member.displayName} to channel: ${channel.name}`)
    } catch (err) {
      __log.error(`Failed to move ${member.displayName} to channel:`, err)
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

    const text_channel_id = __text_channels.get(channel_id)
    if (text_channel_id && voice_channel) {
      const text_channel = voice_channel.guild.channels.cache.get(text_channel_id)
      if (text_channel) {
        await text_channel.delete()
      }
      __text_channels.delete(channel_id)
    }

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
  __text_channels.delete(channel_id)
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

export async function rename_channel(channel: VoiceChannel, new_name: string): Promise<boolean> {
  try {
    await channel.setName(new_name)
    return true
  } catch (error) {
    __log.error("Failed to rename channel:", error)
    return false
  }
}

export async function set_user_limit(channel: VoiceChannel, limit: number): Promise<boolean> {
  try {
    await channel.setUserLimit(limit)
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

export async function create_text_channel(channel: VoiceChannel, owner: GuildMember): Promise<string | null> {
  try {
    if (__text_channels.has(channel.id)) {
      return __text_channels.get(channel.id) || null
    }

    const text_channel = await channel.guild.channels.create({
      name                 : `${channel.name}-chat`,
      type                 : ChannelType.GuildText,
      parent               : channel.parentId || undefined,
      permissionOverwrites : [
        {
          id   : channel.guild.roles.everyone,
          deny : [PermissionFlagsBits.ViewChannel],
        },
        {
          id    : owner.id,
          allow : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    })

    __text_channels.set(channel.id, text_channel.id)
    return text_channel.id
  } catch (error) {
    __log.error("Failed to create text channel:", error)
    return null
  }
}

export async function delete_text_channel(voice_channel_id: string): Promise<boolean> {
  try {
    const text_channel_id = __text_channels.get(voice_channel_id)
    if (!text_channel_id) return false

    __text_channels.delete(voice_channel_id)
    return true
  } catch (error) {
    __log.error("Failed to delete text channel:", error)
    return false
  }
}

export function get_text_channel_id(voice_channel_id: string): string | null {
  return __text_channels.get(voice_channel_id) || null
}

export async function trust_user(channel: VoiceChannel, user_id: string): Promise<boolean> {
  try {
    const trusted = __trusted_users.get(channel.id) || new Set()
    trusted.add(user_id)
    __trusted_users.set(channel.id, trusted)

    await channel.permissionOverwrites.edit(user_id, {
      Connect : true,
      Speak   : true,
    })

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
      Connect: true,
    })
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

  if (!__generator_channel_id && new_state.channel) {
    const channel = new_state.channel
    if (channel.name === __generator_name) {
      __generator_channel_id = channel.id
      __category_id          = channel.parentId || null
      __log.info(`Auto-detected generator channel: ${channel.id}`)
    }
  }

  if (new_state.channelId === __generator_channel_id) {
    await create_temp_channel(member)
    return
  }

  if (new_state.channel && new_state.channel.name === __generator_name && new_state.channelId !== __generator_channel_id) {
    __generator_channel_id = new_state.channelId
    __category_id          = new_state.channel.parentId || null
    __log.info(`Updated generator channel: ${new_state.channelId}`)
    await create_temp_channel(member)
    return
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
