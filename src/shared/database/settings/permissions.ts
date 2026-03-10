/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { GuildMember, PermissionFlagsBits } from "discord.js"
import { load_config }                      from "../../config/loader"
import { member_has_role }                  from "../../utils/discord_api"

interface permissions_config {
  admin_role_id      : string
  moderator_role_id? : string
  staff_role_id?     : string
}

const config            = load_config<permissions_config>("permissions")
const admin_role_id     = config.admin_role_id
const moderator_role_id = config.moderator_role_id
export const staff_role_id = config.staff_role_id ?? ""

/**
 * @description Check if a member has the admin role
 * @param member - GuildMember fetched via REST
 * @returns {boolean}
 */
export function is_admin(member: GuildMember): boolean {
  if (!member?.roles) return false
  return member_has_role(member, admin_role_id)
}

/**
 * @description Check if a member has the moderator role
 * @param member - GuildMember fetched via REST
 * @returns {boolean}
 */
export function is_moderator(member: GuildMember): boolean {
  if (!moderator_role_id) return false
  if (!member?.roles) return false
  return member_has_role(member, moderator_role_id)
}

/**
 * @description Check if a member has the staff role
 * @param member - GuildMember fetched via REST
 * @returns {boolean}
 */
export function is_staff(member: GuildMember): boolean {
  if (!staff_role_id) return false
  if (!member?.roles) return false
  return member_has_role(member, staff_role_id)
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
