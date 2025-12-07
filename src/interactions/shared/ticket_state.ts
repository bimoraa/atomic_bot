import { GuildMember } from "discord.js";
import { load_config } from "../../configuration/loader";
import { db } from "../../utils"

const PURCHASE_TICKETS_COLLECTION = "purchase_tickets"

interface PurchaseTicketData {
  thread_id: string
  owner_id: string
  ticket_id: string
  open_time: number
  claimed_by?: string
  staff: string[]
  log_message_id?: string
}

const ticket_cfg = load_config<{
  ticket_category_id: string;
  log_channel_id: string;
  closed_log_channel_id: string;
  priority_role_id: string;
  panel_channel_id: string;
}>("ticket");

const purchase_cfg = load_config<{
  log_channel_id: string;
  ticket_parent_id: string;
}>("purchase");

export const priority_role_id = ticket_cfg.priority_role_id;
export const log_channel_id = ticket_cfg.log_channel_id;
export const closed_log_channel_id = ticket_cfg.closed_log_channel_id;
export const ticket_channel_id = ticket_cfg.ticket_category_id;

export const purchase_log_channel_id = purchase_cfg.log_channel_id;
export const purchase_ticket_parent_id = purchase_cfg.ticket_parent_id;

export const issue_labels: Record<string, string> = {
  script_issue: "Script Issue",
  discord_issue: "Discord Issue",
  others: "Others",
};

export const ticket_logs: Map<string, string> = new Map();
export const ticket_staff: Map<string, string[]> = new Map();
export const ticket_avatars: Map<string, string> = new Map();
export const ticket_owners: Map<string, string> = new Map();
export const ticket_issues: Map<string, string> = new Map();
export const ticket_descriptions: Map<string, string> = new Map();

export const purchase_logs: Map<string, string> = new Map();
export const purchase_staff: Map<string, string[]> = new Map();
export const purchase_owners: Map<string, string> = new Map();
export const purchase_ticket_ids: Map<string, string> = new Map();
export const purchase_claimed_by: Map<string, string> = new Map();
export const purchase_open_time: Map<string, number> = new Map();

export function generate_ticket_id(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ATMC-${id}`;
}

export function has_priority_role(member: GuildMember): boolean {
  return member.roles.cache.has(priority_role_id);
}

export async function save_purchase_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return

  const data: PurchaseTicketData = {
    thread_id,
    owner_id: purchase_owners.get(thread_id) || "",
    ticket_id: purchase_ticket_ids.get(thread_id) || "",
    open_time: purchase_open_time.get(thread_id) || 0,
    claimed_by: purchase_claimed_by.get(thread_id),
    staff: purchase_staff.get(thread_id) || [],
    log_message_id: purchase_logs.get(thread_id),
  }

  await db.update_one(PURCHASE_TICKETS_COLLECTION, { thread_id }, data, true)
}

export async function load_purchase_ticket(thread_id: string): Promise<boolean> {
  if (!db.is_connected()) return false

  const data = await db.find_one<PurchaseTicketData>(PURCHASE_TICKETS_COLLECTION, { thread_id })
  if (!data) return false

  if (data.owner_id) purchase_owners.set(thread_id, data.owner_id)
  if (data.ticket_id) purchase_ticket_ids.set(thread_id, data.ticket_id)
  if (data.open_time) purchase_open_time.set(thread_id, data.open_time)
  if (data.claimed_by) purchase_claimed_by.set(thread_id, data.claimed_by)
  if (data.staff) purchase_staff.set(thread_id, data.staff)
  if (data.log_message_id) purchase_logs.set(thread_id, data.log_message_id)

  return true
}

export async function delete_purchase_ticket(thread_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.delete_one(PURCHASE_TICKETS_COLLECTION, { thread_id })
}

export async function load_all_purchase_tickets(): Promise<void> {
  if (!db.is_connected()) return

  const tickets = await db.find_many<PurchaseTicketData>(PURCHASE_TICKETS_COLLECTION, {})
  for (const data of tickets) {
    if (data.owner_id) purchase_owners.set(data.thread_id, data.owner_id)
    if (data.ticket_id) purchase_ticket_ids.set(data.thread_id, data.ticket_id)
    if (data.open_time) purchase_open_time.set(data.thread_id, data.open_time)
    if (data.claimed_by) purchase_claimed_by.set(data.thread_id, data.claimed_by)
    if (data.staff) purchase_staff.set(data.thread_id, data.staff)
    if (data.log_message_id) purchase_logs.set(data.thread_id, data.log_message_id)
  }

  console.log(`[purchase_tickets] Loaded ${tickets.length} tickets from database`)
}
