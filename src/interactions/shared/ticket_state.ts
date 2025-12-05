import { GuildMember } from "discord.js";
import { load_config } from "../../configuration/loader";

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
