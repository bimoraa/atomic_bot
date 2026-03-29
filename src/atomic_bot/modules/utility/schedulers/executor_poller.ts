/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client }                             from "discord.js"
import { load_config }                        from "@shared/config/loader"
import { api, component, env, format, logger, time } from "@shared/utils"
import { log_error }                          from "@shared/utils/error_logger"

interface executor_update_config {
  enabled            : boolean
  source_channel_id  : string
  forward_channel_id?: string
  poll_interval_ms   : number
  limit              : number
}

interface executor_update_author {
  id?          : string
  username?    : string
  global_name? : string | null
  bot?         : boolean
}

interface executor_update_attachment {
  id?       : string
  filename? : string
  url?      : string
}

interface executor_update_embed_field {
  name?   : string
  value?  : string
  inline? : boolean
}

interface executor_update_embed {
  type?        : string
  title?       : string
  description? : string
  color?       : number
  fields?      : executor_update_embed_field[]
}

export interface executor_update_message {
  id                : string
  channel_id        : string
  guild_id?         : string
  content?          : string
  timestamp?        : string
  edited_timestamp? : string | null
  mention_everyone? : boolean
  pinned?           : boolean
  type?             : number
  author?           : executor_update_author
  attachments?      : executor_update_attachment[]
  embeds?           : executor_update_embed[]
}

const __discord_api_base_url = "https://discord.com/api/v9"
const __config               = load_config<executor_update_config>("executor_update")
const __role_config          = load_config<Record<string, string>>("reaction_roles")
const __log                  = logger.create_logger("executor_update")

let __started                 = false
let __poll_timer: NodeJS.Timeout | null = null
let __latest_seen_message_id  = ""
let __cached_updates: executor_update_message[] = []

function get_authorization(): string {
  return env.get("EXECUTOR_UPDATE_AUTHORIZATION").trim()
}

function get_limit(): number {
  const limit = Math.floor(__config.limit || 100)
  return Math.min(Math.max(limit, 1), 100)
}

function normalize_message(data: unknown): executor_update_message | null {
  if (!data || typeof data !== "object") return null

  const message = data as executor_update_message
  if (!message.id || !message.channel_id) return null

  return message
}

function compare_message_ids(a: string, b: string): number {
  try {
    const a_id = BigInt(a)
    const b_id = BigInt(b)

    if (a_id === b_id) return 0
    return a_id > b_id ? 1 : -1
  } catch {
    return a.localeCompare(b)
  }
}

function get_jump_url(message: executor_update_message): string | null {
  if (!message.guild_id) return null
  return format.message_url(message.guild_id, message.channel_id, message.id)
}

function get_author_name(message: executor_update_message): string {
  return message.author?.global_name || message.author?.username || "Unknown Author"
}

function get_timestamp_unix(timestamp_value?: string): number | null {
  if (!timestamp_value) return null

  const unix = Math.floor(new Date(timestamp_value).getTime() / 1000)
  return Number.isFinite(unix) && unix > 0 ? unix : null
}

function cleanup_embed_text(value?: string): string {
  if (!value) return ""

  return value
    .replace(/^\*\*(.+)\*\*$/s, "$1")
    .replace(/\*\*(Windows|Mac|Android|iOS)\*\*/g, "$1")
    .trim()
}

function get_primary_embed(message: executor_update_message): executor_update_embed | null {
  const embeds = message.embeds || []

  for (const embed of embeds) {
    if (embed.type !== "rich") continue
    if (!embed.title && !embed.description && !embed.fields?.length) continue
    return embed
  }

  return null
}

function get_embed_field(embed: executor_update_embed, field_name: string): string {
  const field = (embed.fields || []).find((entry) => entry.name?.trim().toLowerCase() === field_name.toLowerCase())
  return field?.value?.trim() || ""
}

function build_forward_payload(message: executor_update_message, embed: executor_update_embed) {
  const jump_url       = get_jump_url(message)
  const message_time   = get_timestamp_unix(message.timestamp)
  const updated_time   = get_timestamp_unix(message.edited_timestamp || undefined)
  const attachment_urls = (message.attachments || [])
    .map((attachment) => attachment.url)
    .filter((url): url is string => Boolean(url))
  const title          = cleanup_embed_text(embed.title)
  const description    = cleanup_embed_text(embed.description)
  const new_version    = get_embed_field(embed, "New Version:")
  const roblox_version = get_embed_field(embed, "Roblox Version:")
  const date_text      = get_embed_field(embed, "Date:")
  const changelog      = get_embed_field(embed, "Changelog:")

  const detail_lines: string[] = []

  if (new_version) {
    detail_lines.push(`New Version: ${new_version}`)
  }

  if (roblox_version) {
    detail_lines.push(`Roblox Version: ${roblox_version}`)
  }

  if (date_text) {
    detail_lines.push(`Date: ${date_text}`)
  }

  const meta_lines: string[] = [
    `- **Author:** ${get_author_name(message)}`,
    `- **Message ID:** ${format.code(message.id)}`,
  ]

  if (message_time) {
    meta_lines.push(`- **Posted:** ${time.full_date_time(message_time)} (${time.relative_time(message_time)})`)
  }

  if (updated_time) {
    meta_lines.push(`- **Edited:** ${time.full_date_time(updated_time)} (${time.relative_time(updated_time)})`)
  }

  if (message.pinned) {
    meta_lines.push(`- **Pinned:** Yes`)
  }

  if (message.mention_everyone) {
    meta_lines.push(`- **Mention Everyone:** Yes`)
  }

  if (attachment_urls.length > 0) {
    meta_lines.push(`- **Attachments:** ${attachment_urls.join("\n")}`)
  }

  return component.build_message({
    content: __role_config.REACTION_ROLE_EXECUTOR_UPDATE
      ? format.role_mention(__role_config.REACTION_ROLE_EXECUTOR_UPDATE)
      : undefined,
    components: [
      component.container({
        components: [
          component.text([
            title ? `## ${title}` : "## Executor Update",
            description || format.italic("No description available."),
          ]),
        ],
      }),
      component.container({
        components: [
          component.text(detail_lines.length > 0 ? detail_lines : "No embed fields available."),
          ...(changelog
            ? [
                component.divider(2),
                component.text([
                  "## Changelogs:",
                  changelog,
                ]),
              ]
            : []),
        ],
      }),
      component.container({
        components: [
          ...(roblox_version
            ? [
                component.action_row(
                  component.secondary_button(
                    `Roblox Version: ${roblox_version.replace(/`/g, "")}`.slice(0, 80),
                    `executor_update_version_${message.id}`,
                    undefined,
                    true,
                  ),
                ),
              ]
            : []),
          ...(jump_url
            ? [
                component.action_row(
                  component.link_button("Open Original Message", jump_url),
                ),
              ]
            : []),
          ...(meta_lines.length > 0
            ? [
                component.divider(2),
                component.text(meta_lines),
              ]
            : []),
        ],
      }),
    ],
  })
}

async function fetch_channel_messages(): Promise<executor_update_message[]> {
  const authorization = get_authorization()
  if (!authorization) {
    __log.warn("Polling skipped because EXECUTOR_UPDATE_AUTHORIZATION is missing")
    return []
  }

  const url = `${__discord_api_base_url}/channels/${__config.source_channel_id}/messages?limit=${get_limit()}`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authorization,
    },
  })

  if (!response.ok) {
    throw new Error(`Executor update request failed with ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as unknown
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(normalize_message)
    .filter((message): message is executor_update_message => Boolean(message))
    .sort((a, b) => compare_message_ids(b.id, a.id))
}

async function forward_new_messages(client: Client, messages: executor_update_message[]): Promise<void> {
  const forward_channel_id = (__config.forward_channel_id || "").trim()
  if (!forward_channel_id) return

  for (const message of messages) {
    const embed = get_primary_embed(message)
    if (!embed) continue

    const payload = build_forward_payload(message, embed)
    const result  = await api.send_components_v2(forward_channel_id, api.get_token(), payload)

    if (result.error) {
      throw new Error(`Failed to forward executor update message ${message.id}`)
    }
  }

  __log.info(`Forwarded ${messages.length} executor update message(s) to ${forward_channel_id}`)
}

async function poll_once(client: Client): Promise<void> {
  const messages = await fetch_channel_messages()
  if (messages.length === 0) return

  __cached_updates = messages

  if (!__latest_seen_message_id) {
    __latest_seen_message_id = messages[0].id
    __log.info(`Initialized executor update cursor at message ${__latest_seen_message_id}`)
    return
  }

  const new_messages = messages
    .filter((message) => compare_message_ids(message.id, __latest_seen_message_id) > 0)
    .sort((a, b) => compare_message_ids(a.id, b.id))

  if (new_messages.length === 0) return

  const embeddable_messages = new_messages.filter((message) => Boolean(get_primary_embed(message)))

  if (embeddable_messages.length > 0) {
    await forward_new_messages(client, embeddable_messages)
    __log.info(`Detected ${embeddable_messages.length} new executor update embed message(s)`)
  }

  __latest_seen_message_id = messages[0].id
}

export function get_cached_executor_updates(): executor_update_message[] {
  return [...__cached_updates]
}

export async function start_executor_update_poller(client: Client): Promise<void> {
  if (__started) return
  __started = true

  if (!__config.enabled) {
    __log.info("Executor update poller is disabled by config")
    return
  }

  if (!__config.source_channel_id) {
    __log.warn("Executor update poller is disabled because source_channel_id is empty")
    return
  }

  try {
    await poll_once(client)
  } catch (error) {
    await log_error(client, error as Error, "Executor Update Poller", {
      source_channel_id: __config.source_channel_id,
    }).catch(() => {})
  }

  __poll_timer = setInterval(() => {
    void poll_once(client).catch(async (error) => {
      await log_error(client, error as Error, "Executor Update Poller", {
        source_channel_id: __config.source_channel_id,
      }).catch(() => {})
    })
  }, Math.max(__config.poll_interval_ms || 30000, 10000))

  __log.info(`Executor update poller started for channel ${__config.source_channel_id}`)
}

export function stop_executor_update_poller(): void {
  if (__poll_timer) {
    clearInterval(__poll_timer)
    __poll_timer = null
  }

  __started = false
}
