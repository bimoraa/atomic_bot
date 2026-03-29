/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 临时语音聊天记录管理器 - \\
// - tempvoice chat transcript manager - \\

import { randomUUID }           from "crypto"
import { VoiceChannel, Collection }          from "discord.js"
import { db }                   from "@shared/utils"
import { log_error }            from "@shared/utils/error_logger"
import type {
  tempvoice_transcript_data,
  tempvoice_transcript_message,
  tempvoice_attachment,
}                               from "@models/tempvoice_transcript.model"

const __collection = "tempvoice_transcripts"

/**
 * - 从语音频道收集文字聊天消息 - \\
 * - collect text-in-voice messages from a voice channel - \\
 * @param channel - voice channel to collect from
 * @param limit - max messages to fetch
 * @returns collected messages
 */
export async function collect_voice_chat_messages(
  channel : VoiceChannel,
  limit   : number = 500,
): Promise<tempvoice_transcript_message[]> {
  const messages: tempvoice_transcript_message[] = []
  let last_id: string | undefined

  while (messages.length < limit) {
    const options: any = { limit: Math.min(100, limit - messages.length) }
    if (last_id) options.before = last_id

    const fetched = await channel.messages.fetch(options)

    if (!(fetched instanceof Collection) || fetched.size === 0) break

    for (const [, msg] of fetched.entries()) {
      const attachments: tempvoice_attachment[] = Array.from(msg.attachments.values()).map((a: any) => ({
        url          : a.url,
        filename     : a.name ?? "unknown",
        size         : a.size,
        content_type : a.contentType,
      }))

      messages.push({
        id            : msg.id,
        author_id     : msg.author.id,
        author_tag    : msg.author.tag,
        author_avatar : msg.author.displayAvatarURL({ size: 128 }),
        content       : msg.content,
        attachments,
        timestamp     : Math.floor(msg.createdTimestamp / 1000),
        is_bot        : msg.author.bot,
      })
    }

    const last_msg = Array.from(fetched.values()).pop()
    last_id = last_msg?.id
  }

  return messages.reverse()
}

/**
 * - 保存临时语音聊天记录 - \\
 * - save tempvoice chat transcript - \\
 * @param data - transcript data to persist
 * @returns transcript_id on success, null on failure
 */
export async function save_tempvoice_transcript(
  data : tempvoice_transcript_data,
): Promise<string | null> {
  if (!db.is_connected()) return null

  try {
    await db.insert_one(__collection, {
      transcript_id    : data.transcript_id,
      channel_id       : data.channel_id,
      channel_name     : data.channel_name,
      owner_id         : data.owner_id,
      owner_tag        : data.owner_tag,
      guild_id         : data.guild_id,
      messages         : JSON.stringify(data.messages),
      created_at       : data.created_at,
      deleted_at       : data.deleted_at,
      duration_seconds : data.duration_seconds,
      total_visitors   : data.total_visitors,
    })

    return data.transcript_id
  } catch (error) {
    console.error("[ - TEMPVOICE TRANSCRIPT - ] Failed to save:", error)
    return null
  }
}

/**
 * - 按 ID 获取临时语音聊天记录 - \\
 * - get tempvoice transcript by id - \\
 * @param transcript_id - uuid of the transcript
 * @returns transcript data or null
 */
export async function get_tempvoice_transcript(
  transcript_id : string,
): Promise<tempvoice_transcript_data | null> {
  if (!db.is_connected()) return null

  try {
    const row = await db.find_one<any>(__collection, { transcript_id })
    if (!row) return null

    return {
      transcript_id    : row.transcript_id,
      channel_id       : row.channel_id,
      channel_name     : row.channel_name,
      owner_id         : row.owner_id,
      owner_tag        : row.owner_tag,
      guild_id         : row.guild_id,
      messages         : typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages,
      created_at       : row.created_at,
      deleted_at       : row.deleted_at,
      duration_seconds : row.duration_seconds,
      total_visitors   : row.total_visitors,
    }
  } catch (error) {
    console.error("[ - TEMPVOICE TRANSCRIPT - ] Failed to fetch:", error)
    return null
  }
}

/**
 * - 获取用户的所有临时语音聊天记录 - \\
 * - get all tempvoice transcripts for a user - \\
 * @param owner_id - discord user id
 * @returns list of transcripts (without messages for performance)
 */
export async function get_user_tempvoice_transcripts(
  owner_id : string,
): Promise<Omit<tempvoice_transcript_data, "messages">[]> {
  if (!db.is_connected()) return []

  try {
    const rows = await db.find_many<any>(__collection, { owner_id })

    return rows.map(row => ({
      transcript_id    : row.transcript_id,
      channel_id       : row.channel_id,
      channel_name     : row.channel_name,
      owner_id         : row.owner_id,
      owner_tag        : row.owner_tag,
      guild_id         : row.guild_id,
      created_at       : row.created_at,
      deleted_at       : row.deleted_at,
      duration_seconds : row.duration_seconds,
      total_visitors   : row.total_visitors,
    }))
  } catch (error) {
    console.error("[ - TEMPVOICE TRANSCRIPT - ] Failed to fetch user list:", error)
    return []
  }
}

/**
 * - 生成新的记录 ID - \\
 * - generate new transcript id - \\
 * @returns uuid string
 */
export function generate_tempvoice_transcript_id(): string {
  return randomUUID()
}
