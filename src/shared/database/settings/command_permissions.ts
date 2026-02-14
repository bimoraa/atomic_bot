import { GuildMember } from "discord.js"
import { join } from "path"
import { file, cache } from "../../utils"

interface CommandPermission {
  role_ids:           string[] | null
  roles:              string[]
  allow_higher_roles: boolean
}

interface RolesMapping {
  [key: string]: string
}

const __permissions_dir = join(__dirname, "../permissions")
const __roles_path      = join(__permissions_dir, "roles.cfg")

function load_roles_mapping(): RolesMapping {
  return cache.get_or_set("roles_mapping", () => {
    if (!file.exists(__roles_path)) return {}
    try {
      return file.read_json<RolesMapping>(__roles_path)
    } catch {
      return {}
    }
  })
}

function load_command_permission(command_name: string): CommandPermission | null {
  return cache.get_or_set(`perm_${command_name}`, () => {
    const perm_path = join(__permissions_dir, `${command_name}.cfg`)
    if (!file.exists(perm_path)) return null
    try {
      return file.read_json<CommandPermission>(perm_path)
    } catch {
      return null
    }
  })
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
  cache.clear()
}
