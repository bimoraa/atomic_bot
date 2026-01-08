import { GuildMember } from "discord.js"
import { load_config } from "../../configuration/loader"
import { db } from "../../utils"

const TICKETS_COLLECTION = "unified_tickets"

// - BATCH SAVE OPTIMIZATION - \\
let save_queue: Set<string> = new Set()
let save_timeout: NodeJS.Timeout | null = null
const BATCH_DELAY_MS = 500

export interface TicketTypeConfig {
  name: string
  prefix: string
  thread_prefix: string
  ticket_parent_id: string
  log_channel_id: string
  closed_log_channel_id: string
  panel_channel_id: string
  require_role: boolean
  required_role_id: string
  show_payment_message: boolean
  require_issue_type: boolean
}

interface UnifiedTicketConfig {
  ticket_types: Record<string, TicketTypeConfig>
  issue_labels: Record<string, string>
}

export interface TicketData {
  thread_id: string
  ticket_type: string
  owner_id: string
  ticket_id: string
  open_time: number
  claimed_by?: string
  staff: string[]
  log_message_id?: string
  issue_type?: string
  description?: string
}

const unified_cfg = load_config<UnifiedTicketConfig>("unified_ticket")

export const ticket_types = unified_cfg.ticket_types
export const issue_labels = unified_cfg.issue_labels

export const ticket_data: Map<string, TicketData> = new Map()
export const open_tickets: Map<string, Map<string, string>> = new Map()

for (const type_key of Object.keys(ticket_types)) {
  open_tickets.set(type_key, new Map())
}

export function get_ticket_config(ticket_type: string): TicketTypeConfig | undefined {
  return ticket_types[ticket_type]
}

export function generate_ticket_id(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = ""
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `ATMC-${id}`
}

export function has_required_role(member: GuildMember, ticket_type: string): boolean {
  const config = get_ticket_config(ticket_type)
  if (!config || !config.require_role) return true
  return member.roles.cache.has(config.required_role_id)
}

export function get_ticket(thread_id: string): TicketData | undefined {
  return ticket_data.get(thread_id)
}

export function set_ticket(thread_id: string, data: TicketData): void {
  ticket_data.set(thread_id, data)
}

export function delete_ticket(thread_id: string): void {
  ticket_data.delete(thread_id)
}

export function get_user_open_ticket(ticket_type: string, user_id: string): string | undefined {
  return open_tickets.get(ticket_type)?.get(user_id)
}

export function set_user_open_ticket(ticket_type: string, user_id: string, thread_id: string): void {
  open_tickets.get(ticket_type)?.set(user_id, thread_id)
}

export function remove_user_open_ticket(ticket_type: string, user_id: string): void {
  open_tickets.get(ticket_type)?.delete(user_id)
}

export async function save_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return

  const data = ticket_data.get(thread_id)
  if (!data) return

  save_queue.add(thread_id)

  if (save_timeout) clearTimeout(save_timeout)

  save_timeout = setTimeout(async () => {
    await flush_save_queue()
  }, BATCH_DELAY_MS)
}

export async function save_ticket_immediate(thread_id: string): Promise<void> {
  if (!db.is_connected()) return

  const data = ticket_data.get(thread_id)
  if (!data) return

  await db.update_one(TICKETS_COLLECTION, { thread_id }, data, true)
}

async function flush_save_queue(): Promise<void> {
  if (save_queue.size === 0) return

  const tickets_to_save = Array.from(save_queue)
  save_queue.clear()

  const save_promises = tickets_to_save.map(async (thread_id) => {
    const data = ticket_data.get(thread_id)
    if (!data) return
    await db.update_one(TICKETS_COLLECTION, { thread_id }, data, true)
  })

  await Promise.allSettled(save_promises)
}

export async function flush_all_tickets(): Promise<void> {
  if (save_timeout) {
    clearTimeout(save_timeout)
    save_timeout = null
  }
  await flush_save_queue()
}

export async function load_ticket(thread_id: string): Promise<boolean> {
  if (!db.is_connected()) return false

  const data = await db.find_one<TicketData>(TICKETS_COLLECTION, { thread_id })
  if (!data) return false

  ticket_data.set(thread_id, data)
  return true
}

export async function delete_ticket_db(thread_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.delete_one(TICKETS_COLLECTION, { thread_id })
}

export async function load_all_tickets(): Promise<void> {
  if (!db.is_connected()) return

  const tickets = await db.find_many<TicketData>(TICKETS_COLLECTION, {})
  for (const data of tickets) {
    ticket_data.set(data.thread_id, data)

    if (data.owner_id && data.ticket_type) {
      set_user_open_ticket(data.ticket_type, data.owner_id, data.thread_id)
    }
  }

  console.log(`[unified_tickets] Loaded ${tickets.length} tickets from database`)
}
