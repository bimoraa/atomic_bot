/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 票务系统的模块控制器 - \
// - module controller for the ticket system - \
import { GuildMember }                                from "discord.js"
import { load_config }                               from "@shared/config/loader"
import { db }                                        from "@shared/utils"
import { purchase_ticket_data, priority_ticket_data } from "@models/ticket.model"

const __purchase_tickets_collection = "purchase_tickets"
const __priority_tickets_collection = "priority_tickets"

const ticket_cfg = load_config<{
  ticket_category_id    : string
  log_channel_id        : string
  closed_log_channel_id : string
  priority_role_id      : string
  panel_channel_id      : string
}>("ticket")

const purchase_cfg = load_config<{
  log_channel_id        : string
  closed_log_channel_id : string
  ticket_parent_id      : string
  panel_channel_id      : string
}>("purchase")

export const priority_role_id               = ticket_cfg.priority_role_id
export const priority_log_channel_id        = ticket_cfg.log_channel_id
export const priority_closed_log_channel_id = ticket_cfg.closed_log_channel_id
export const priority_ticket_parent_id      = ticket_cfg.ticket_category_id
export const priority_panel_channel_id      = ticket_cfg.panel_channel_id

export const log_channel_id        = ticket_cfg.log_channel_id
export const closed_log_channel_id = ticket_cfg.closed_log_channel_id
export const ticket_channel_id     = ticket_cfg.ticket_category_id

export const purchase_log_channel_id        = purchase_cfg.log_channel_id
export const purchase_closed_log_channel_id = purchase_cfg.closed_log_channel_id
export const purchase_ticket_parent_id      = purchase_cfg.ticket_parent_id
export const purchase_panel_channel_id      = purchase_cfg.panel_channel_id

export const issue_labels: Record<string, string> = {
  script_issue  : "Script Issue",
  discord_issue : "Discord Issue",
  others        : "Others",
}

export const ticket_logs         : Map<string, string>   = new Map()
export const ticket_staff        : Map<string, string[]> = new Map()
export const ticket_avatars      : Map<string, string>   = new Map()
export const ticket_owners       : Map<string, string>   = new Map()
export const ticket_issues       : Map<string, string>   = new Map()
export const ticket_descriptions : Map<string, string>   = new Map()
export const ticket_ticket_ids   : Map<string, string>   = new Map()
export const ticket_claimed_by   : Map<string, string>   = new Map()
export const ticket_open_time    : Map<string, number>   = new Map()

export const purchase_logs       : Map<string, string>   = new Map()
export const purchase_staff      : Map<string, string[]> = new Map()
export const purchase_owners     : Map<string, string>   = new Map()
export const purchase_ticket_ids : Map<string, string>   = new Map()
export const purchase_claimed_by : Map<string, string>   = new Map()
export const purchase_open_time  : Map<string, number>   = new Map()

export function generate_ticket_id(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id      = ""
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `ATMC-${id}`
}

/**
 * @description check if member has priority role — uses resolved roles from GuildMember
 * @param member - GuildMember fetched via REST (not from cache)
 * @returns {boolean} true if member has priority role
 */
export function has_priority_role(member: GuildMember): boolean {
  return member.roles.resolve(priority_role_id) !== null
}

export async function save_purchase_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return

  const data: purchase_ticket_data = {
    thread_id,
    owner_id       : purchase_owners.get(thread_id) || "",
    ticket_id      : purchase_ticket_ids.get(thread_id) || "",
    open_time      : purchase_open_time.get(thread_id) || 0,
    claimed_by     : purchase_claimed_by.get(thread_id),
    staff          : purchase_staff.get(thread_id) || [],
    log_message_id : purchase_logs.get(thread_id),
  }

  await db.update_one(__purchase_tickets_collection, { thread_id }, data, true)
}

export async function load_purchase_ticket(thread_id: string): Promise<boolean> {
  if (!db.is_connected()) return false

  const data = await db.find_one<purchase_ticket_data>(__purchase_tickets_collection, { thread_id })
  if (!data) return false

  if (data.owner_id)       purchase_owners.set(thread_id, data.owner_id)
  if (data.ticket_id)      purchase_ticket_ids.set(thread_id, data.ticket_id)
  if (data.open_time)      purchase_open_time.set(thread_id, data.open_time)
  if (data.claimed_by)     purchase_claimed_by.set(thread_id, data.claimed_by)
  if (data.staff)          purchase_staff.set(thread_id, data.staff)
  if (data.log_message_id) purchase_logs.set(thread_id, data.log_message_id)

  return true
}

export async function delete_purchase_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.delete_one(__purchase_tickets_collection, { thread_id })
}

export async function load_all_purchase_tickets(): Promise<void> {
  if (!db.is_connected()) return

  const tickets = await db.find_many<purchase_ticket_data>(__purchase_tickets_collection, {})
  for (const data of tickets) {
    if (data.owner_id)       purchase_owners.set(data.thread_id, data.owner_id)
    if (data.ticket_id)      purchase_ticket_ids.set(data.thread_id, data.ticket_id)
    if (data.open_time)      purchase_open_time.set(data.thread_id, data.open_time)
    if (data.claimed_by)     purchase_claimed_by.set(data.thread_id, data.claimed_by)
    if (data.staff)          purchase_staff.set(data.thread_id, data.staff)
    if (data.log_message_id) purchase_logs.set(data.thread_id, data.log_message_id)
  }

  console.log(`[purchase_tickets] Loaded ${tickets.length} tickets from database`)
}

export async function save_priority_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return

  const data: priority_ticket_data = {
    thread_id,
    owner_id       : ticket_owners.get(thread_id) || "",
    ticket_id      : ticket_ticket_ids.get(thread_id) || "",
    open_time      : ticket_open_time.get(thread_id) || 0,
    claimed_by     : ticket_claimed_by.get(thread_id),
    staff          : ticket_staff.get(thread_id) || [],
    log_message_id : ticket_logs.get(thread_id),
    issue_type     : ticket_issues.get(thread_id) || "",
    description    : ticket_descriptions.get(thread_id) || "",
  }

  await db.update_one(__priority_tickets_collection, { thread_id }, data, true)
}

export async function load_priority_ticket(thread_id: string): Promise<boolean> {
  if (!db.is_connected()) return false

  const data = await db.find_one<priority_ticket_data>(__priority_tickets_collection, { thread_id })
  if (!data) return false

  if (data.owner_id)       ticket_owners.set(thread_id, data.owner_id)
  if (data.ticket_id)      ticket_ticket_ids.set(thread_id, data.ticket_id)
  if (data.open_time)      ticket_open_time.set(thread_id, data.open_time)
  if (data.claimed_by)     ticket_claimed_by.set(thread_id, data.claimed_by)
  if (data.staff)          ticket_staff.set(thread_id, data.staff)
  if (data.log_message_id) ticket_logs.set(thread_id, data.log_message_id)
  if (data.issue_type)     ticket_issues.set(thread_id, data.issue_type)
  if (data.description)    ticket_descriptions.set(thread_id, data.description)

  return true
}

export async function delete_priority_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.delete_one(__priority_tickets_collection, { thread_id })
}

export async function load_all_priority_tickets(): Promise<void> {
  if (!db.is_connected()) return

  const tickets = await db.find_many<priority_ticket_data>(__priority_tickets_collection, {})
  for (const data of tickets) {
    if (data.owner_id)       ticket_owners.set(data.thread_id, data.owner_id)
    if (data.ticket_id)      ticket_ticket_ids.set(data.thread_id, data.ticket_id)
    if (data.open_time)      ticket_open_time.set(data.thread_id, data.open_time)
    if (data.claimed_by)     ticket_claimed_by.set(data.thread_id, data.claimed_by)
    if (data.staff)          ticket_staff.set(data.thread_id, data.staff)
    if (data.log_message_id) ticket_logs.set(data.thread_id, data.log_message_id)
    if (data.issue_type)     ticket_issues.set(data.thread_id, data.issue_type)
    if (data.description)    ticket_descriptions.set(data.thread_id, data.description)
  }

  console.log(`[priority_tickets] Loaded ${tickets.length} tickets from database`)
}
