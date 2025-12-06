import { GuildMember } from "discord.js"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

interface CommandPermission {
  role_ids:           string[] | null
  roles:              string[]
  allow_higher_roles: boolean
}

interface RolesMapping {
  [key: string]: string
}

const permissions_cache = new Map<string, CommandPermission>()
let roles_mapping: RolesMapping | null = null

function load_roles_mapping(): RolesMapping {
  if (roles_mapping) return roles_mapping

  const file_path = join(__dirname, "../permissions/roles.cfg")

  if (!existsSync(file_path)) {
    roles_mapping = {}
    return roles_mapping
  }

  try {
    const content = readFileSync(file_path, "utf-8")
    roles_mapping = JSON.parse(content) as RolesMapping
    return roles_mapping
  } catch {
    roles_mapping = {}
    return roles_mapping
  }
}

function load_command_permission(command_name: string): CommandPermission | null {
  if (permissions_cache.has(command_name)) {
    return permissions_cache.get(command_name)!
  }

  const file_path = join(__dirname, `../permissions/${command_name}.cfg`)

  if (!existsSync(file_path)) {
    return null
  }

  try {
    const content    = readFileSync(file_path, "utf-8")
    const permission = JSON.parse(content) as CommandPermission
    permissions_cache.set(command_name, permission)
    return permission
  } catch {
    return null
  }
}

function resolve_role_ids(permission: CommandPermission): string[] {
  const role_ids: string[] = []
  const mapping = load_roles_mapping()

  if (permission.role_ids && permission.role_ids.length > 0) {
    role_ids.push(...permission.role_ids)
  }

  if (permission.roles && permission.roles.length > 0) {
    for (const role_name of permission.roles) {
      const role_id = mapping[role_name]
      if (role_id) {
        role_ids.push(role_id)
      }
    }
  }

  return role_ids
}

function get_highest_role_position(member: GuildMember, role_ids: string[]): number {
  let highest = -1

  for (const role_id of role_ids) {
    const role = member.guild.roles.cache.get(role_id)
    if (role && role.position > highest) {
      highest = role.position
    }
  }

  return highest
}

export function can_use_command(member: GuildMember, command_name: string): boolean {
  const permission = load_command_permission(command_name)

  if (!permission) {
    return true
  }

  const role_ids = resolve_role_ids(permission)

  if (role_ids.length === 0) {
    return true
  }

  for (const role_id of role_ids) {
    if (member.roles.cache.has(role_id)) {
      return true
    }
  }

  if (permission.allow_higher_roles) {
    const required_position = get_highest_role_position(member, role_ids)
    const member_highest    = member.roles.highest.position

    if (member_highest > required_position) {
      return true
    }
  }

  return false
}

export function get_required_roles(command_name: string): string[] {
  const permission = load_command_permission(command_name)
  if (!permission) return []
  return resolve_role_ids(permission)
}

export function clear_permission_cache(): void {
  permissions_cache.clear()
  roles_mapping = null
}
