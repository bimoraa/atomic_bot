import { Client, GuildMember } from "discord.js"
import { component, db }       from "../../../../shared/utils"
import type { container_component, message_payload } from "../../../../shared/utils"
import { log_error }           from "../../../../shared/utils/error_logger"
import { Cache }               from "../../../../shared/utils/cache"
import * as random             from "../../../../shared/utils/random"

const SETTINGS_COLLECTION    = "rod_settings"
const SETTINGS_CHANNEL_ID    = "1444073420030476309"
const SHARE_SETTINGS_ROLE_ID = "1398313779380617459"
const ROD_LIST_COLLECTION    = "rod_settings_rods"
const SKIN_LIST_COLLECTION   = "rod_settings_skins"

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
  const total        = record.star_total || 0
  const count        = record.star_count || 0
  const average      = count > 0 ? total / count : 0
  const average_text = average.toFixed(1)
  const voter_text   = count === 1 ? "Voter" : "Voters"

  return `Star: ${average_text} / 5 - ${count} ${voter_text}`
}

/**
 * - BUILD SETTINGS TITLE - \\
 * @param {rod_settings_record} record - Settings record
 * @returns {string} Title
 */
function build_settings_title(record: rod_settings_record): string {
  const skin = record.rod_skin ? record.rod_skin : "No Skin"
  return `${record.rod_name} - ${skin}`
}

/**
 * - BUILD SETTINGS COMPONENT - \\
 * @param {rod_settings_record} record - Settings record
 * @param {string} token - Search token
 * @returns {container_component} Container component
 */
function build_settings_component(record: rod_settings_record, token?: string): container_component {
  const star_summary   = build_star_summary(record)
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
      component.section({
        content   : [star_summary],
        accessory : component.secondary_button("Give the Publisher Star", token ? `share_settings_star:${record.settings_id}:${token}` : `share_settings_star:${record.settings_id}`),
      }),
      component.divider(2),
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

  const footer_component = component.container({
    components : [
      component.action_row(
        component.secondary_button("Previous", `share_settings_prev:${options.token}:${clamped_index}`, undefined, previous_disabled),
        component.secondary_button("Next", `share_settings_next:${options.token}:${clamped_index}`, undefined, next_disabled)
      ),
      component.divider(2),
      component.select_menu(`share_settings_select:${options.token}`, "Search Rod Settings", select_options),
    ],
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
