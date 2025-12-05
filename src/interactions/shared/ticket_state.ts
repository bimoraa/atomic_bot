import { GuildMember } from "discord.js";

export const priority_role_id = "1398313779380617459";
export const log_channel_id = "1445745610027171892";
export const closed_log_channel_id = "1445771395467444366";
export const ticket_channel_id = "1260623558175096897";

export const purchase_log_channel_id = "1392575437481447557";

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
