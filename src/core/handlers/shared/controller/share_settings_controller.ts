import {
  ChannelType,
  Client,
  ForumChannel,
  GuildMember,
  TextChannel,
  ThreadAutoArchiveDuration,
  ThreadChannel,
}                               from "discord.js"
import { api, component, db }    from "../../../../shared/utils"
import type { container_component, message_payload } from "../../../../shared/utils"
import { log_error }            from "../../../../shared/utils/error_logger"
import { Cache }                from "../../../../shared/utils/cache"
import * as random              from "../../../../shared/utils/random"

const SETTINGS_COLLECTION    = "rod_settings"
const SETTINGS_CHANNEL_ID    = "1444073420030476309"
const FORUM_CHANNEL_ID       = "1444080629162578001"
const THREAD_PARENT_ID       = "1468393418869968936"
const SHARE_SETTINGS_ROLE_ID = "1398313779380617459"
const ROD_LIST_COLLECTION    = "rod_settings_rods"
const SKIN_LIST_COLLECTION   = "rod_settings_skins"
const FORUM_TAG_POPULAR       = "Most Popular"
const MOST_POPULAR_MIN_LIKES  = 10
const FORUM_STICKY_COLLECTION = "rod_settings_forum_sticky"
const FORUM_THREAD_STICKY_COLLECTION = "rod_settings_forum_thread_sticky"

export interface rod_settings_record {
  settings_id        : string
  publisher_id       : string
  publisher_name     : string
  publisher_avatar   : string
  mode               : string
  version            : string
  location           : string
  total_notification : string
  rod_name           : string
  rod_skin           : string | null
  cancel_delay       : string
  complete_delay     : string
  note               : string
  star_total         : number
  star_count         : number
  star_voters        : string[]
  use_count          : number
  thread_id?         : string
  thread_link?       : string
  forum_thread_id?   : string
  forum_message_id?  : string
  forum_channel_id?  : string
  message_id?        : string
  channel_id?        : string
  created_at         : number
  updated_at         : number
}

export interface share_settings_input {
  publisher_id       : string
  publisher_name     : string
  publisher_avatar   : string
  mode               : string
  version            : string
  location           : string
  total_notification : string
  rod_name           : string
  rod_skin           : string | null
  cancel_delay       : string
  complete_delay     : string
  note               : string
}

interface search_cache_entry {
  record_ids : string[]
  query      : {
    rod_name?  : string
    rod_skin?  : string
    filter_by? : string
  }
  created_at : number
}

interface pending_settings_entry {
  action      : "create" | "edit"
  user_id     : string
  settings_id?: string
  payload     : Partial<share_settings_input>
  created_at  : number
}

const search_cache  = new Cache<search_cache_entry>(5 * 60 * 1000, 1000, 60 * 1000, "share_settings_search")
const pending_cache = new Cache<pending_settings_entry>(10 * 60 * 1000, 1000, 60 * 1000, "share_settings_pending")

const DEFAULT_ROD_LIST = [
  "Diamond Rod",
  "Element Rod",
  "Ghostfinn Rod",
  "Bamboo Rod",
  "Angler Rod",
  "Ares Rod",
  "Hazmat Rod",
]

const DEFAULT_SKIN_LIST = [
  "1x1x1x1 Ban Hammer",
  "Binary Edge",
  "Blackhole Sword",
  "Christmas Parasol",
  "Corruption Edge",
  "Crescendo Scythe",
  "Cursed Katana",
  "Eclipce Katana",
  "Eternal Flower",
  "Frozer Krampus Scythe",
  "Gingerbread Katana",
  "Holy Trident",
  "Princess Parasol",
  "Soul Scythe",
  "The Vanquisher",
]

/**
 * - CHECK SHARE SETTINGS ROLE - \\
 * @param {GuildMember | null} member - Guild member
 * @returns {boolean} True when allowed
 */
export function can_use_share_settings(member: GuildMember | null): boolean {
  if (!member) return false
  return member.roles.cache.has(SHARE_SETTINGS_ROLE_ID)
}

/**
 * - CREATE PENDING ENTRY - \\
 * @param {pending_settings_entry} entry - Pending entry
 * @returns {string} Token
 */
export function create_pending_entry(entry: pending_settings_entry): string {
  const token = random.random_string(16)
  pending_cache.set(token, entry)
  return token
}

/**
 * - GET PENDING ENTRY - \\
 * @param {string} token - Token
 * @returns {pending_settings_entry | null} Entry
 */
export function get_pending_entry(token: string): pending_settings_entry | null {
  return pending_cache.get(token) || null
}

/**
 * - REMOVE PENDING ENTRY - \\
 * @param {string} token - Token
 * @returns {void}
 */
export function remove_pending_entry(token: string): void {
  pending_cache.delete(token)
}

/**
 * - UPDATE PENDING PAYLOAD - \\
 * @param {string} token - Token
 * @param {Partial<share_settings_input>} payload - Payload update
 * @returns {pending_settings_entry | null} Entry
 */
export function update_pending_payload(token: string, payload: Partial<share_settings_input>): pending_settings_entry | null {
  const entry = pending_cache.get(token)
  if (!entry) return null

  const updated: pending_settings_entry = {
    ...entry,
    payload : {
      ...entry.payload,
      ...payload,
    },
  }

  pending_cache.set(token, updated)
  return updated
}

/**
 * - LIST ROD OPTIONS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<string[]>} Rod list
 */
export async function list_rod_options(client: Client): Promise<string[]> {
  try {
    const stored = await db.find_one<{ values: string[] }>(ROD_LIST_COLLECTION, { key: "rods" })
    const combined = [...DEFAULT_ROD_LIST, ...(stored?.values || [])]
    return Array.from(new Set(combined)).filter(Boolean)
  } catch (error) {
    await log_error(client, error as Error, "share_settings_rod_list", {})
    return DEFAULT_ROD_LIST
  }
}

/**
 * - LIST SKIN OPTIONS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<string[]>} Skin list
 */
export async function list_skin_options(client: Client): Promise<string[]> {
  try {
    const stored = await db.find_one<{ values: string[] }>(SKIN_LIST_COLLECTION, { key: "skins" })
    const combined = [...DEFAULT_SKIN_LIST, ...(stored?.values || [])]
    return Array.from(new Set(combined)).filter(Boolean)
  } catch (error) {
    await log_error(client, error as Error, "share_settings_skin_list", {})
    return DEFAULT_SKIN_LIST
  }
}

/**
 * - ADD ROD OPTION - \\
 * @param {Client} client - Discord client
 * @param {string} rod_name - Rod name
 * @returns {Promise<boolean>} Result
 */
export async function add_rod_option(client: Client, rod_name: string): Promise<boolean> {
  try {
    const list = await list_rod_options(client)
    const updated = Array.from(new Set([...list, rod_name])).filter(Boolean)
    await db.update_one(ROD_LIST_COLLECTION, { key: "rods" }, { key: "rods", values: updated }, true)
    return true
  } catch (error) {
    await log_error(client, error as Error, "share_settings_add_rod", {
      rod_name : rod_name,
    })
    return false
  }
}

/**
 * - ADD SKIN OPTION - \\
 * @param {Client} client - Discord client
 * @param {string} skin_name - Skin name
 * @returns {Promise<boolean>} Result
 */
export async function add_skin_option(client: Client, skin_name: string): Promise<boolean> {
  try {
    const list = await list_skin_options(client)
    const updated = Array.from(new Set([...list, skin_name])).filter(Boolean)
    await db.update_one(SKIN_LIST_COLLECTION, { key: "skins" }, { key: "skins", values: updated }, true)
    return true
  } catch (error) {
    await log_error(client, error as Error, "share_settings_add_skin", {
      skin_name : skin_name,
    })
    return false
  }
}

/**
 * - GET SETTINGS CHANNEL ID - \\
 * @returns {string} Channel ID
 */
export function get_settings_channel_id(): string {
  return SETTINGS_CHANNEL_ID
}

/**
 * - GET FORUM CHANNEL ID - \\
 * @returns {string} Channel ID
 */
export function get_forum_channel_id(): string {
  return FORUM_CHANNEL_ID
}

/**
 * - NORMALIZE TEXT - \\
 * @param {string} value - Input text
 * @returns {string} Normalized text
 */
function normalize_text(value: string): string {
  return value.toLowerCase().trim()
}

/**
 * - BUILD STAR SUMMARY - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string} Star summary
 */
function build_star_summary(record: rod_settings_record): string {
  const count = record.star_count || 0
  return `Total Like: ${count}`
}

/**
 * - BUILD FORUM THREAD NAME - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string} Thread name
 */
function build_forum_thread_name(record: rod_settings_record): string {
  const skin_text = record.rod_skin ? record.rod_skin : "No Skin"
  return `${record.rod_name} - ${skin_text} by ${record.publisher_name}`
}

/**
 * - BUILD SETTINGS MESSAGE LINK - \\
 * @param {Client} client - Discord client
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<string | null>} Link
 */
async function build_settings_message_link(client: Client, record: rod_settings_record): Promise<string | null> {
  if (record.channel_id && record.message_id) {
    const channel = await client.channels.fetch(record.channel_id).catch(() => null)
    if (channel && "guildId" in channel && channel.guildId) {
      return `https://discord.com/channels/${channel.guildId}/${record.channel_id}/${record.message_id}`
    }
  }

  if (record.forum_thread_id && record.forum_message_id) {
    const thread = await client.channels.fetch(record.forum_thread_id).catch(() => null)
    if (thread && "guildId" in thread && thread.guildId) {
      return `https://discord.com/channels/${thread.guildId}/${record.forum_thread_id}/${record.forum_message_id}`
    }
  }

  if (record.forum_thread_id) {
    const thread = await client.channels.fetch(record.forum_thread_id).catch(() => null)
    if (thread && "guildId" in thread && thread.guildId) {
      return `https://discord.com/channels/${thread.guildId}/${record.forum_thread_id}`
    }
  }

  return null
}

/**
 * - BUILD TAG NAMES - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string[]} Tag names
 */
function build_tag_names(record: rod_settings_record): string[] {
  const skin_text = record.rod_skin ? record.rod_skin : "No Skin"
  return [record.rod_name, skin_text]
}

/**
 * - CHECK MOST POPULAR - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {boolean} True when popular
 */
function is_most_popular(record: rod_settings_record): boolean {
  const average = record.star_count > 0 ? record.star_total / record.star_count : 0
  return record.star_count >= MOST_POPULAR_MIN_LIKES && average >= 4.5
}

/**
 * - ENSURE FORUM TAGS - \\
 * @param {Client} client - Discord client
 * @param {ForumChannel} forum - Forum channel
 * @returns {Promise<Map<string, string>>} Tag map
 */
async function ensure_forum_tags(client: Client, forum: ForumChannel, required: string[]): Promise<Map<string, string>> {
  const existing = forum.availableTags || []
  const existing_map = new Map(existing.map((tag) => [tag.name, tag.id]))

  const missing = required.filter((name) => !existing_map.has(name))
  if (missing.length > 0) {
    const updated_tags = [
      ...existing,
      ...missing.map((name) => ({ name: name, moderated: false })),
    ]

    try {
      const updated_forum = await forum.setAvailableTags(updated_tags)
      const updated_map = new Map(updated_forum.availableTags.map((tag) => [tag.name, tag.id]))
      return updated_map
    } catch (error) {
      await log_error(client, error as Error, "share_settings_forum_tags", {
        channel_id : forum.id,
        missing    : missing,
      })
    }
  }

  return existing_map
}

/**
 * - BUILD APPLIED TAGS - \\
 * @param {rod_settings_record} record - Settings record
 * @param {Map<string, string>} tag_map - Tag map
 * @returns {string[]} Applied tag ids
 */
function build_applied_tags(record: rod_settings_record, tag_map: Map<string, string>): string[] {
  const tag_ids: string[] = []
  const rod_id  = tag_map.get(record.rod_name)
  const skin_id = tag_map.get(record.rod_skin ? record.rod_skin : "No Skin")
  const pop_id  = tag_map.get(FORUM_TAG_POPULAR)

  if (rod_id) tag_ids.push(rod_id)
  if (skin_id) tag_ids.push(skin_id)
  if (pop_id && is_most_popular(record)) tag_ids.push(pop_id)

  return Array.from(new Set(tag_ids))
}

/**
 * - BUILD FORUM STICKY MESSAGE - \\
 * @param {rod_settings_record} record - Settings record
 * @param {string} settings_link - Settings link
 * @returns {message_payload} Message payload
 */
function build_forum_sticky_message(record: rod_settings_record, settings_link: string): message_payload {
  return component.build_message({
    components : [
      component.container({
        components : [
          component.text([
            "## Latest Rod Settings",
            `${record.rod_name} - ${record.rod_skin || "No Skin"} by ${record.publisher_name}`,
            `Total Like: ${record.star_count}`,
          ]),
        ],
      }),
      component.container({
        components : [
          component.action_row(
            component.link_button("Open Settings", settings_link)
          ),
        ],
      }),
    ],
  })
}

/**
 * - BUILD FORUM THREAD STICKY MESSAGE - \\
 * @param {rod_settings_record} record - Settings record
 * @param {string} settings_link - Settings link
 * @returns {message_payload} Message payload
 */
function build_forum_thread_sticky_message(record: rod_settings_record, settings_link: string): message_payload {
  return component.build_message({
    components : [
      component.container({
        components : [
          component.text([
            "## Settings Shortcut",
            `${record.rod_name} - ${record.rod_skin || "No Skin"} by ${record.publisher_name}`,
            `Total Like: ${record.star_count}`,
          ]),
        ],
      }),
      component.container({
        components : [
          component.action_row(
            component.link_button("Open Settings", settings_link)
          ),
        ],
      }),
    ],
  })
}

/**
 * - UPDATE FORUM THREAD STICKY - \\
 * @param {Client} client - Discord client
 * @param {string} thread_id - Thread ID
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<void>} Void
 */
export async function update_forum_thread_sticky(client: Client, thread_id: string, record: rod_settings_record): Promise<void> {
  try {
    const thread_channel = await client.channels.fetch(thread_id).catch(() => null)
    if (!thread_channel || !thread_channel.isThread()) return

    const settings_link = record.forum_thread_id && record.forum_message_id && "guildId" in thread_channel && thread_channel.guildId
      ? `https://discord.com/channels/${thread_channel.guildId}/${record.forum_thread_id}/${record.forum_message_id}`
      : await build_settings_message_link(client, record)

    if (!settings_link) return

    const previous = await db.find_one<{ key: string; message_id?: string }>(FORUM_THREAD_STICKY_COLLECTION, { key: thread_id })

    const payload = build_forum_thread_sticky_message(record, settings_link)
    if (previous?.message_id) {
      const edited = await api.edit_components_v2(thread_id, previous.message_id, api.get_token(), payload)
      if (!edited?.error) {
        await db.update_one(FORUM_THREAD_STICKY_COLLECTION, { key: thread_id }, {
          key        : thread_id,
          message_id : previous.message_id,
        }, true)
        return
      }
    }

    const result = await api.send_components_v2(thread_id, api.get_token(), payload)
    if (result.error || !result.id) {
      await log_error(client, new Error("Failed to send thread sticky"), "share_settings_thread_sticky", {
        thread_id : thread_id,
        response  : result,
      })
      return
    }

    await pin_forum_message(client, thread_id, String(result.id))
    await db.update_one(FORUM_THREAD_STICKY_COLLECTION, { key: thread_id }, {
      key        : thread_id,
      message_id : String(result.id),
    }, true)
  } catch (error) {
    await log_error(client, error as Error, "share_settings_thread_sticky", {
      thread_id : thread_id,
    })
  }
}

/**
 * - UPDATE FORUM STICKY MESSAGE - \\
 * @param {Client} client - Discord client
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<void>} Void
 */
export async function update_forum_sticky_message(client: Client, record: rod_settings_record): Promise<void> {
  const settings_link = await build_settings_message_link(client, record)
  if (!settings_link) return

  try {
    const forum_channel = await client.channels.fetch(FORUM_CHANNEL_ID).catch(() => null)
    if (!forum_channel || forum_channel.type !== ChannelType.GuildForum) {
      await log_error(client, new Error("Forum channel not found"), "share_settings_forum_sticky", {
        channel_id : FORUM_CHANNEL_ID,
      })
      return
    }

    const previous = await db.find_one<{ key: string; thread_id?: string }>(FORUM_STICKY_COLLECTION, { key: "latest" })
    if (previous?.thread_id) {
      const old_thread = await client.channels.fetch(previous.thread_id).catch(() => null)
      if (old_thread && old_thread.isThread()) {
        await old_thread.delete().catch(() => {})
      }
    }

    const forum = forum_channel as ForumChannel
    const thread = await forum.threads.create({
      name               : "Latest Rod Settings",
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      message            : {
        content : "Latest Rod Settings",
      },
    })

    const payload = build_forum_sticky_message(record, settings_link)
    const result = await api.send_components_v2(thread.id, api.get_token(), payload)

    if (result.error || !result.id) {
      await log_error(client, new Error("Failed to send forum sticky"), "share_settings_forum_sticky", {
        thread_id : thread.id,
        response  : result,
      })
      return
    }

    await pin_forum_message(client, thread.id, String(result.id))
    await db.update_one(FORUM_STICKY_COLLECTION, { key: "latest" }, {
      key        : "latest",
      thread_id  : thread.id,
      message_id : String(result.id),
      channel_id : FORUM_CHANNEL_ID,
      created_at : Date.now(),
    }, true)
  } catch (error) {
    await log_error(client, error as Error, "share_settings_forum_sticky", {
      channel_id : FORUM_CHANNEL_ID,
    })
  }
}

/**
 * - PIN FORUM MESSAGE - \\
 * @param {Client} client - Discord client
 * @param {string} thread_id - Thread ID
 * @param {string} message_id - Message ID
 * @returns {Promise<void>} Void
 */
export async function pin_forum_message(client: Client, thread_id: string, message_id: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(thread_id).catch(() => null)
    if (!channel || !channel.isThread()) return

    const message = await channel.messages.fetch(message_id).catch(() => null)
    if (!message) return

    if (!message.pinned) {
      await message.pin().catch(() => {})
    }
  } catch (error) {
    await log_error(client, error as Error, "share_settings_forum_pin", {
      thread_id  : thread_id,
      message_id : message_id,
    })
  }
}

/**
 * - BACKFILL FORUM EXTRAS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>} Void
 */
export async function backfill_forum_extras(client: Client): Promise<void> {
  try {
    const records = await list_settings_records(client)
    const updated_records = records.filter((record) => record.forum_thread_id && record.forum_message_id)

    for (const record of updated_records) {
      if (record.forum_thread_id && record.forum_message_id) {
        await pin_forum_message(client, record.forum_thread_id, record.forum_message_id)
      }
    }

    const latest = updated_records
      .filter((record) => record.forum_thread_id && record.forum_message_id)
      .sort((a, b) => b.created_at - a.created_at)[0]
    if (latest) {
      await update_forum_sticky_message(client, latest)
    }
  } catch (error) {
    await log_error(client, error as Error, "share_settings_forum_backfill", {})
  }
}

/**
 * - BUILD SHARE SETTINGS PICKER MESSAGE - \\
 * @param {object} options - Picker options
 * @param {string} options.token - Pending token
 * @param {string[]} options.rod_options - Rod options
 * @param {string[]} options.skin_options - Skin options
 * @param {string | null} options.selected_rod - Selected rod
 * @param {string | null} options.selected_skin - Selected skin
 * @returns {message_payload} Message payload
 */
export function build_share_settings_picker_message(options: {
  token         : string
  rod_options   : string[]
  skin_options  : string[]
  selected_rod? : string | null
  selected_skin?: string | null
}): message_payload {
  const selected_rod  = options.selected_rod || null
  const selected_skin = options.selected_skin || null

  const rod_choices = options.rod_options
    .slice(0, 25)
    .map((value) => ({
      label   : value,
      value   : value,
      default : selected_rod === value,
    }))

  const skin_choices = [
    { label: "No Skin", value: "no_skin", default: selected_skin === null },
    ...options.skin_options
      .slice(0, 24)
      .map((value) => ({
        label   : value,
        value   : value,
        default : selected_skin === value,
      })),
  ]

  const disabled_continue = !selected_rod

  return component.build_message({
    components : [
      component.container({
        components : [
          component.text([
            "## Share Settings - Select Rod",
            `- Rod Name: ${selected_rod || "-"}`,
            `- Rod Skin: ${selected_skin || "No Skin"}`,
          ]),
        ],
      }),
      component.container({
        components : [
          component.select_menu(`share_settings_pick_rod:${options.token}`, "Select Rod Name", rod_choices),
          component.divider(2),
          component.select_menu(`share_settings_pick_skin:${options.token}`, "Select Rod Skin", skin_choices),
          component.divider(2),
          component.action_row(
            component.primary_button("Continue", `share_settings_continue:${options.token}`, undefined, disabled_continue)
          ),
        ],
      }),
    ],
  })
}

/**
 * - ENSURE PUBLISHER THREAD - \\
 * @param {Client} client - Discord client
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<{ thread_id?: string; thread_link?: string }>} Thread data
 */
export async function ensure_publisher_thread(
  client: Client,
  record: rod_settings_record
): Promise<{ thread_id?: string; thread_link?: string }> {
  if (record.thread_id && record.thread_link) {
    const existing = await client.channels.fetch(record.thread_id).catch(() => null)
    if (existing && existing.isThread()) {
      const thread = existing as ThreadChannel
      if (thread.archived) {
        await thread.setArchived(false).catch(() => {})
      }
    }
    return { thread_id: record.thread_id, thread_link: record.thread_link }
  }

  try {
    const channel = await client.channels.fetch(THREAD_PARENT_ID).catch(() => null)
    if (!channel) {
      await log_error(client, new Error("Publisher thread parent not found"), "share_settings_thread_parent", {
        parent_id : THREAD_PARENT_ID,
      })
      return {}
    }

    const thread_name = `Publisher - ${record.publisher_name}`

    if (channel.type === ChannelType.GuildForum) {
      const forum = channel as ForumChannel
      const thread = await forum.threads.create({
        name               : thread_name,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        message            : {
          content : `Thread for <@${record.publisher_id}>`,
        },
      })
      return {
        thread_id   : thread.id,
        thread_link : `https://discord.com/channels/${thread.guildId}/${thread.id}`,
      }
    }

    if (channel.isTextBased() && "threads" in channel) {
      const text = channel as TextChannel
      const start_message = await text.send({ content: `Thread for <@${record.publisher_id}>` })
      const thread = await text.threads.create({
        name               : thread_name,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        type               : ChannelType.PublicThread,
        startMessage       : start_message.id,
      })

      return {
        thread_id   : thread.id,
        thread_link : `https://discord.com/channels/${thread.guildId}/${thread.id}`,
      }
    }

    await log_error(client, new Error("Unsupported thread parent channel"), "share_settings_thread_parent", {
      parent_id : THREAD_PARENT_ID,
      type      : channel.type,
    })
    return {}
  } catch (error) {
    await log_error(client, error as Error, "share_settings_thread_create", {
      parent_id    : THREAD_PARENT_ID,
      publisher_id : record.publisher_id,
    })
    return {}
  }
}

/**
 * - ENSURE FORUM POST - \\
 * @param {Client} client - Discord client
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<{ forum_thread_id?: string; forum_message_id?: string; forum_channel_id?: string }>} Forum data
 */
export async function ensure_forum_post(
  client: Client,
  record: rod_settings_record
): Promise<{ forum_thread_id?: string; forum_message_id?: string; forum_channel_id?: string }> {
  if (record.forum_thread_id && record.forum_message_id && record.forum_channel_id) {
    return {
      forum_thread_id  : record.forum_thread_id,
      forum_message_id : record.forum_message_id,
      forum_channel_id : record.forum_channel_id,
    }
  }

  try {
    const channel = await client.channels.fetch(FORUM_CHANNEL_ID).catch(() => null)
    if (!channel || channel.type !== ChannelType.GuildForum) {
      await log_error(client, new Error("Forum channel not found"), "share_settings_forum_parent", {
        channel_id : FORUM_CHANNEL_ID,
      })
      return {}
    }

    const forum = channel as ForumChannel
    const required_tags = [...build_tag_names(record), FORUM_TAG_POPULAR]
    const tag_map = await ensure_forum_tags(client, forum, required_tags)
    const applied_tags = build_applied_tags(record, tag_map)
    const thread = await forum.threads.create({
      name               : build_forum_thread_name(record),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      appliedTags        : applied_tags,
      message            : {
        content : `Rod settings by <@${record.publisher_id}>`,
      },
    })

    const message_payload = build_forum_message(record)
    const result = await api.send_components_v2(thread.id, api.get_token(), message_payload)

    if (result.error || !result.id) {
      await log_error(client, new Error("Failed to send forum message"), "share_settings_forum_post", {
        thread_id : thread.id,
        response  : result,
      })
      return {
        forum_thread_id  : thread.id,
        forum_channel_id : FORUM_CHANNEL_ID,
      }
    }

    await pin_forum_message(client, thread.id, String(result.id))
    await update_forum_sticky_message(client, record)

    return {
      forum_thread_id  : thread.id,
      forum_message_id : String(result.id),
      forum_channel_id : FORUM_CHANNEL_ID,
    }
  } catch (error) {
    await log_error(client, error as Error, "share_settings_forum_create", {
      channel_id   : FORUM_CHANNEL_ID,
      settings_id  : record.settings_id,
      publisher_id : record.publisher_id,
    })
    return {}
  }
}

/**
 * - UPDATE FORUM MESSAGE - \\
 * @param {Client} client - Discord client
 * @param {rod_settings_record} record - Settings record
 * @returns {Promise<boolean>} Result
 */
export async function update_forum_message(client: Client, record: rod_settings_record): Promise<boolean> {
  if (!record.forum_thread_id || !record.forum_message_id) return false

  try {
    const channel = await client.channels.fetch(record.forum_thread_id).catch(() => null)
    if (channel && channel.isThread()) {
      const expected_name = build_forum_thread_name(record)
      if (channel.name !== expected_name) {
        await channel.setName(expected_name).catch(() => {})
      }

      await pin_forum_message(client, record.forum_thread_id, record.forum_message_id)

      const forum = await client.channels.fetch(FORUM_CHANNEL_ID).catch(() => null)
      if (forum && forum.type === ChannelType.GuildForum) {
        const required_tags = [...build_tag_names(record), FORUM_TAG_POPULAR]
        const tag_map = await ensure_forum_tags(client, forum as ForumChannel, required_tags)
        const applied_tags = build_applied_tags(record, tag_map)
        if ("setAppliedTags" in channel) {
          await channel.setAppliedTags(applied_tags).catch(() => {})
        }
      }
    }

    const payload = build_forum_message(record)
    const response = await api.edit_components_v2(record.forum_thread_id, record.forum_message_id, api.get_token(), payload)
    if (response?.error) {
      await log_error(client, new Error("Failed to update forum message"), "share_settings_forum_update", {
        thread_id  : record.forum_thread_id,
        message_id : record.forum_message_id,
        response   : response,
      })
      return false
    }
    return true
  } catch (error) {
    await log_error(client, error as Error, "share_settings_forum_update", {
      thread_id  : record.forum_thread_id,
      message_id : record.forum_message_id,
    })
    return false
  }
}

/**
 * - ENSURE THREAD ACTIVE - \\
 * @param {Client} client - Discord client
 * @param {string} thread_id - Thread ID
 * @returns {Promise<void>} Void
 */
export async function ensure_thread_active(client: Client, thread_id: string): Promise<void> {
  const channel = await client.channels.fetch(thread_id).catch(() => null)
  if (!channel || !channel.isThread()) return

  const thread = channel as ThreadChannel
  if (thread.archived) {
    await thread.setArchived(false).catch(() => {})
  }
}

/**
 * - BUILD SETTINGS TITLE - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string} Title
 */
export function build_settings_title(record: rod_settings_record): string {
  const skin = record.rod_skin ? record.rod_skin : "No Skin"
  return `${record.rod_name} - ${skin}`
}

/**
 * - BUILD SETTINGS LABEL - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string} Label
 */
export function build_settings_label(record: rod_settings_record): string {
  return `${build_settings_title(record)} (${record.settings_id})`
}

/**
 * - BUILD LEADERBOARD MESSAGE - \\
 * @param {rod_settings_record[]} records - Settings records
 * @returns {message_payload} Message payload
 */
export function build_leaderboard_message(records: rod_settings_record[]): message_payload {
  if (records.length === 0) {
    return component.build_message({
      components : [
        component.container({
          components : [
            component.text("## Settings Leaderboard"),
          ],
        }),
        component.container({
          components : [
            component.text("No settings found."),
          ],
        }),
      ],
    })
  }

  const sorted = [...records].sort((a, b) => {
    const a_avg = a.star_count > 0 ? a.star_total / a.star_count : 0
    const b_avg = b.star_count > 0 ? b.star_total / b.star_count : 0
    if (b_avg !== a_avg) return b_avg - a_avg
    if (b.star_count !== a.star_count) return b.star_count - a.star_count
    return b.created_at - a.created_at
  })

  const lines = sorted.slice(0, 10).map((record, index) => {
    const skin_text = record.rod_skin ? record.rod_skin : "No Skin"
    return `${index + 1}. <@${record.publisher_id}> - ${record.rod_name} (${skin_text}) - Total Like: ${record.star_count}`
  })

  return component.build_message({
    components : [
      component.container({
        components : [
          component.text("## Settings Leaderboard"),
        ],
      }),
      component.container({
        components : [
          component.text(lines),
        ],
      }),
    ],
  })
}

/**
 * - BUILD SETTINGS COMPONENT - \\
 * @param {rod_settings_record} record - Settings record
 * @param {string} token - Search token
 * @returns {container_component} Container component
 */
function build_settings_component(record: rod_settings_record, token?: string): container_component {
  const star_summary   = build_star_summary(record)
  const star_line      = `- ${star_summary}`
  const settings_lines = [
    `### Settings by <@${record.publisher_id}>`,
    `- Mode: ${record.mode}`,
    `- Version: ${record.version}`,
    `- Location: ${record.location}`,
    `- Total Notification: ${record.total_notification}`,
  ]

  const rod_skin_text = record.rod_skin ? record.rod_skin : "No Skin"

  return component.container({
    components : [
      component.section({
        content   : settings_lines,
        accessory : record.publisher_avatar ? component.thumbnail(record.publisher_avatar) : undefined,
      }),
      component.divider(2),
      component.text([
        `- Rod Name: ${record.rod_name}`,
        `- Rod Skin: ${rod_skin_text}`,
      ]),
      component.divider(2),
      component.text([
        `- Cancel Delay: ${record.cancel_delay}`,
        `- Complete Delay: ${record.complete_delay}`,
      ]),
      component.divider(2),
      component.text([
        "- Note from Publisher:",
        `> ${record.note || "-"}`,
      ]),
      component.divider(2),
      component.section({
        content   : [star_line],
        accessory : component.secondary_button("Give the Publisher Like", token ? `share_settings_star:${record.settings_id}:${token}` : `share_settings_star:${record.settings_id}`),
      }),
    ],
  })
}

/**
 * - BUILD FORUM MESSAGE - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {message_payload} Message payload
 */
export function build_forum_message(record: rod_settings_record): message_payload {
  return component.build_message({
    components : [
      component.container({
        components : [
          component.text("## Community - Rod Settings"),
        ],
      }),
      build_settings_component(record),
    ],
  })
}

/**
 * - BUILD SETTINGS MESSAGE - \\
 * @param {rod_settings_record} record - Settings record
 * @param {object} options - Message options
 * @param {string} options.footer_token - Search token
 * @param {number} options.index - Index
 * @param {number} options.total - Total count
 * @returns {message_payload} Message payload
 */
export function build_settings_message(
  record: rod_settings_record,
  options?: {
    footer_token?: string
    index?: number
    total?: number
  }
): message_payload {
  const header_component = component.container({
    components : [
      component.text("## Community - Rod Settings"),
    ],
  })

  const footer_components: any[] = []

  if (options?.footer_token) {
    const index             = options.index ?? 0
    const total             = options.total ?? 1
    const previous_disabled = index <= 0
    const next_disabled     = index >= total - 1

    footer_components.push(
      component.action_row(
        component.secondary_button("Previous", `share_settings_prev:${options.footer_token}:${index}`, undefined, previous_disabled),
        component.secondary_button("Next", `share_settings_next:${options.footer_token}:${index}`, undefined, next_disabled)
      ),
      component.divider(2),
      component.text(`Page ${index + 1}/${total}`)
    )
  }

  if (record.thread_link) {
    footer_components.push(component.divider(2))
    footer_components.push(component.action_row(
      component.link_button("Publisher Thread ( Bincang )", record.thread_link as string)
    ))
  }

  return component.build_message({
    components : [
      header_component,
      build_settings_component(record),
      ...(footer_components.length > 0 ? [component.container({ components : footer_components })] : []),
    ],
  })
}

/**
 * - BUILD SEARCH MESSAGE - \\
 * @param {rod_settings_record} record - Settings record
 * @param {object} options - Search options
 * @param {string} options.token - Search token
 * @param {rod_settings_record[]} options.records - Records
 * @param {number} options.index - Index
 * @returns {message_payload} Message payload
 */
export function build_search_message(options: {
  token   : string
  records : rod_settings_record[]
  index   : number
}): message_payload {
  const clamped_index = Math.min(Math.max(options.index, 0), options.records.length - 1)
  const record        = options.records[clamped_index]

  const select_options = options.records.slice(0, 25).map((item) => {
    return {
      label       : build_settings_title(item),
      value       : item.settings_id,
      description : build_star_summary(item),
      default     : item.settings_id === record.settings_id,
    }
  })

  const previous_disabled = clamped_index <= 0
  const next_disabled     = clamped_index >= options.records.length - 1

  const footer_components = [
    component.action_row(
      component.secondary_button("Previous", `share_settings_prev:${options.token}:${clamped_index}`, undefined, previous_disabled),
      component.secondary_button("Next", `share_settings_next:${options.token}:${clamped_index}`, undefined, next_disabled)
    ),
    component.divider(2),
    component.select_menu(`share_settings_select:${options.token}`, "Search Rod Setings", select_options),
  ]

  if (record.thread_link) {
    footer_components.push(component.divider(2))
    footer_components.push(
      component.action_row(
        component.link_button("Publisher Thread ( Bincang )", record.thread_link)
      )
    )
  }

  const footer_component = component.container({
    components : footer_components,
  })

  return component.build_message({
    components : [
      component.container({
        components : [
          component.text("## Community - Rod Settings"),
        ],
      }),
      build_settings_component(record, options.token),
      footer_component,
    ],
  })
}

/**
 * - CREATE SETTINGS RECORD - \\
 * @param {Client} client - Discord client
 * @param {share_settings_input} input - Settings input
 * @returns {Promise<rod_settings_record | null>} Record
 */
export async function create_settings_record(client: Client, input: share_settings_input): Promise<rod_settings_record | null> {
  try {
    const now = Date.now()
    const record: rod_settings_record = {
      settings_id        : random.snowflake(),
      publisher_id       : input.publisher_id,
      publisher_name     : input.publisher_name,
      publisher_avatar   : input.publisher_avatar,
      mode               : input.mode,
      version            : input.version,
      location           : input.location,
      total_notification : input.total_notification,
      rod_name           : input.rod_name,
      rod_skin           : input.rod_skin,
      cancel_delay       : input.cancel_delay,
      complete_delay     : input.complete_delay,
      note               : input.note,
      star_total         : 0,
      star_count         : 0,
      star_voters        : [],
      use_count          : 0,
      created_at         : now,
      updated_at         : now,
    }

    await db.insert_one<rod_settings_record>(SETTINGS_COLLECTION, record)
    return record
  } catch (error) {
    await log_error(client, error as Error, "share_settings_create", {})
    return null
  }
}

/**
 * - UPDATE SETTINGS RECORD - \\
 * @param {Client} client - Discord client
 * @param {string} settings_id - Settings ID
 * @param {Partial<rod_settings_record>} update - Update payload
 * @returns {Promise<rod_settings_record | null>} Updated record
 */
export async function update_settings_record(
  client: Client,
  settings_id: string,
  update: Partial<rod_settings_record>
): Promise<rod_settings_record | null> {
  try {
    const existing = await get_settings_record(client, settings_id)
    if (!existing) return null

    const updated: rod_settings_record = {
      ...existing,
      ...update,
      updated_at : Date.now(),
    }

    await db.update_one<rod_settings_record>(SETTINGS_COLLECTION, { settings_id: settings_id }, updated, true)
    return updated
  } catch (error) {
    await log_error(client, error as Error, "share_settings_update", {
      settings_id : settings_id,
    })
    return null
  }
}

/**
 * - GET SETTINGS RECORD - \\
 * @param {Client} client - Discord client
 * @param {string} settings_id - Settings ID
 * @returns {Promise<rod_settings_record | null>} Record
 */
export async function get_settings_record(client: Client, settings_id: string): Promise<rod_settings_record | null> {
  try {
    return await db.find_one<rod_settings_record>(SETTINGS_COLLECTION, { settings_id: settings_id })
  } catch (error) {
    await log_error(client, error as Error, "share_settings_get", {
      settings_id : settings_id,
    })
    return null
  }
}

/**
 * - LIST SETTINGS RECORDS - \\
 * @param {Client} client - Discord client
 * @returns {Promise<rod_settings_record[]>} Records
 */
export async function list_settings_records(client: Client): Promise<rod_settings_record[]> {
  try {
    return await db.find_many<rod_settings_record>(SETTINGS_COLLECTION, {})
  } catch (error) {
    await log_error(client, error as Error, "share_settings_list", {})
    return []
  }
}

/**
 * - GET SETTINGS BY FORUM THREAD - \\
 * @param {Client} client - Discord client
 * @param {string} thread_id - Thread ID
 * @returns {Promise<rod_settings_record | null>} Record
 */
export async function get_settings_by_forum_thread_id(client: Client, thread_id: string): Promise<rod_settings_record | null> {
  try {
    return await db.find_one<rod_settings_record>(SETTINGS_COLLECTION, { forum_thread_id: thread_id })
  } catch (error) {
    await log_error(client, error as Error, "share_settings_get_by_forum_thread", {
      thread_id : thread_id,
    })
    return null
  }
}

/**
 * - LIST SETTINGS BY PUBLISHER - \\
 * @param {Client} client - Discord client
 * @param {string} publisher_id - Publisher ID
 * @returns {Promise<rod_settings_record[]>} Records
 */
export async function list_settings_by_publisher(client: Client, publisher_id: string): Promise<rod_settings_record[]> {
  try {
    return await db.find_many<rod_settings_record>(SETTINGS_COLLECTION, { publisher_id: publisher_id })
  } catch (error) {
    await log_error(client, error as Error, "share_settings_list_by_publisher", {
      publisher_id : publisher_id,
    })
    return []
  }
}

/**
 * - DELETE SETTINGS RECORD - \\
 * @param {Client} client - Discord client
 * @param {string} settings_id - Settings ID
 * @returns {Promise<rod_settings_record | null>} Deleted record
 */
export async function delete_settings_record(client: Client, settings_id: string): Promise<rod_settings_record | null> {
  try {
    const record = await get_settings_record(client, settings_id)
    if (!record) return null

    await db.delete_one(SETTINGS_COLLECTION, { settings_id: settings_id })
    return record
  } catch (error) {
    await log_error(client, error as Error, "share_settings_delete", {
      settings_id : settings_id,
    })
    return null
  }
}

/**
 * - CREATE SEARCH TOKEN - \\
 * @param {rod_settings_record[]} records - Records
 * @param {object} query - Query
 * @returns {string} Token
 */
export function create_search_token(records: rod_settings_record[], query: { rod_name?: string; rod_skin?: string; filter_by?: string }, token?: string): string {
  const generated = token || random.random_string(12)
  search_cache.set(generated, {
    record_ids : records.map((record) => record.settings_id),
    query      : query,
    created_at : Date.now(),
  })

  return generated
}

/**
 * - GET SEARCH ENTRY - \\
 * @param {string} token - Search token
 * @returns {search_cache_entry | null} Entry
 */
export function get_search_entry(token: string): search_cache_entry | null {
  return search_cache.get(token) || null
}

/**
 * - BUILD RECORD LIST FROM SEARCH - \\
 * @param {Client} client - Discord client
 * @param {search_cache_entry} entry - Cache entry
 * @returns {Promise<rod_settings_record[]>} Records
 */
export async function build_records_from_search(client: Client, entry: search_cache_entry): Promise<rod_settings_record[]> {
  const records = await list_settings_records(client)
  const record_map = new Map(records.map((record) => [record.settings_id, record]))

  return entry.record_ids
    .map((id) => record_map.get(id))
    .filter(Boolean) as rod_settings_record[]
}

/**
 * - SEARCH SETTINGS RECORDS - \\
 * @param {Client} client - Discord client
 * @param {object} options - Search options
 * @param {string} options.rod_name - Rod name
 * @param {string} options.rod_skin - Rod skin
 * @param {string} options.filter_by - Filter type
 * @returns {Promise<rod_settings_record[]>} Records
 */
export async function search_settings_records(client: Client, options: { rod_name?: string; rod_skin?: string; filter_by?: string }): Promise<rod_settings_record[]> {
  const records = await list_settings_records(client)
  const normalized_name = options.rod_name ? normalize_text(options.rod_name) : ""
  const normalized_skin = options.rod_skin ? normalize_text(options.rod_skin) : ""

  let filtered = records.filter((record) => {
    const name_match = normalized_name ? normalize_text(record.rod_name).includes(normalized_name) : true
    const skin_value = normalize_text(record.rod_skin || "")
    const skin_match = normalized_skin
      ? (normalized_skin === "no_skin" ? skin_value.length === 0 : skin_value.includes(normalized_skin))
      : true
    return name_match && skin_match
  })

  if (options.filter_by === "most_used") {
    filtered = filtered.sort((a, b) => b.use_count - a.use_count)
  } else if (options.filter_by === "highest_star") {
    filtered = filtered.sort((a, b) => {
      const a_avg = a.star_count > 0 ? a.star_total / a.star_count : 0
      const b_avg = b.star_count > 0 ? b.star_total / b.star_count : 0
      return b_avg - a_avg
    })
  } else if (options.filter_by === "best") {
    filtered = filtered.sort((a, b) => {
      const a_avg = a.star_count > 0 ? a.star_total / a.star_count : 0
      const b_avg = b.star_count > 0 ? b.star_total / b.star_count : 0
      if (b_avg !== a_avg) return b_avg - a_avg
      return b.star_count - a.star_count
    })
  }

  return filtered
}

/**
 * - APPLY STAR VOTE - \\
 * @param {Client} client - Discord client
 * @param {string} settings_id - Settings ID
 * @param {string} user_id - User ID
 * @returns {Promise<{ success: boolean; message?: string; record?: rod_settings_record }>} Result
 */
export async function apply_star_vote(
  client: Client,
  settings_id: string,
  user_id: string
): Promise<{ success: boolean; message?: string; record?: rod_settings_record }> {
  const record = await get_settings_record(client, settings_id)
  if (!record) {
    return { success: false, message: "Settings not found" }
  }

  if (record.star_voters.includes(user_id)) {
    return { success: false, message: "You already gave a star" }
  }

  const updated = await update_settings_record(client, settings_id, {
    star_total  : record.star_total + 5,
    star_count  : record.star_count + 1,
    star_voters : [...record.star_voters, user_id],
  })

  if (!updated) {
    return { success: false, message: "Failed to update star" }
  }

  return { success: true, record: updated }
}

/**
 * - INCREMENT USE COUNT - \\
 * @param {Client} client - Discord client
 * @param {string} settings_id - Settings ID
 * @returns {Promise<void>} Void
 */
export async function increment_use_count(client: Client, settings_id: string): Promise<void> {
  const record = await get_settings_record(client, settings_id)
  if (!record) return

  await update_settings_record(client, settings_id, {
    use_count : record.use_count + 1,
  })
}
