import { GuildMember } from "discord.js";

const admin_role_id = "1277272542914281512";

export function is_admin(member: GuildMember): boolean {
  return member.roles.cache.has(admin_role_id);
}
