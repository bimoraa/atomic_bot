import { GuildMember, PermissionFlagsBits } from "discord.js"
import { load_config } from "../../config/loader"

interface permissions_config {
  admin_role_id:     string
  moderator_role_id?: string
  staff_role_id?:    string
}

const config            = load_config<permissions_config>("permissions")
const admin_role_id     = config.admin_role_id
const moderator_role_id = config.moderator_role_id
export const staff_role_id     = config.staff_role_id ?? ""

export function is_admin(member: GuildMember): boolean {
  if (!member || !member.roles || !member.roles.cache) {
    console.error("[ - PERMISSIONS ERROR - ] Invalid member object", {
      has_member: !!member,
      has_roles: !!(member?.roles),
      has_cache: !!(member?.roles?.cache),
    })
    return false
  }
  return member.roles.cache.has(admin_role_id)
}

export function is_moderator(member: GuildMember): boolean {
  if (!moderator_role_id) return false
  if (!member || !member.roles || !member.roles.cache) return false
  return member.roles.cache.has(moderator_role_id)
}

export function is_staff(member: GuildMember): boolean {
  if (!staff_role_id) return false
  if (!member || !member.roles || !member.roles.cache) return false
  return member.roles.cache.has(staff_role_id)
}

export function is_admin_or_mod(member: GuildMember): boolean {
  return is_admin(member) || is_moderator(member)
}

export function has_permission(member: GuildMember, permission: bigint): boolean {
  return member.permissions.has(permission)
}

export function can_manage_messages(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageMessages)
}

export function can_manage_roles(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageRoles)
}

export function can_kick_members(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.KickMembers)
}

export function can_ban_members(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.BanMembers)
}

export function is_owner(member: GuildMember): boolean {
  return member.id === member.guild.ownerId
}
