import { GuildMember } from "discord.js";
import { load_config } from "../configuration/loader";

const config = load_config<{ admin_role_id: string }>("permissions");
const admin_role_id = config.admin_role_id;

export function is_admin(member: GuildMember): boolean {
  return member.roles.cache.has(admin_role_id);
}
