/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - Snipe 功能的缓存，记录最近删除的消息 - \
// - snipe cache, stores recently deleted messages - \
import { Message, PartialMessage } from "discord.js"

interface DeletedMessage {
  content      : string
  author_tag   : string
  author_id    : string
  deleted_at   : number
  attachments  : string[]
}

const deleted_messages = new Map<string, DeletedMessage>()

export function track_deleted_message(message: Message | PartialMessage): void {
  if (message.author?.bot) return
  if (!message.content && (!message.attachments || message.attachments.size === 0)) return
  if (!message.author) return

  const attachment_urls = message.attachments ? Array.from(message.attachments.values()).map(a => a.url) : []

  deleted_messages.set(message.channel.id, {
    content     : message.content || "",
    author_tag  : message.author.tag,
    author_id   : message.author.id,
    deleted_at  : Date.now(),
    attachments : attachment_urls,
  })
}

export function get_last_deleted_message(channel_id: string): DeletedMessage | null {
  return deleted_messages.get(channel_id) || null
}
