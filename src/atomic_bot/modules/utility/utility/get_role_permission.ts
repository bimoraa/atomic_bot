import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js"
import { Command } from "@shared/types/command"
import { readdirSync } from "fs"
import { join } from "path"
import { component, api, file } from "@shared/utils"

interface RolesMapping {
  [key: string]: string
}

interface CommandPermission {
  role_ids:           string[] | null
  roles:              string[]
  allow_higher_roles: boolean
}

const __permissions_dir = join(__dirname, "../../permissions")
const __roles_path      = join(__permissions_dir, "roles.cfg")

function load_roles(): RolesMapping {
  if (!file.exists(__roles_path)) return {}
  try {
    return file.read_json<RolesMapping>(__roles_path)
  } catch {
    return {}
  }
}

function load_permission(command_name: string): CommandPermission | null {
  const perm_path = join(__permissions_dir, `${command_name}.cfg`)
  if (!file.exists(perm_path)) return null
  try {
    return file.read_json<CommandPermission>(perm_path)
  } catch {
    return null
  }
}

function get_all_permission_files(): string[] {
  if (!file.dir_exists(__permissions_dir)) return []
  
  return readdirSync(__permissions_dir)
    .filter(f => f.endsWith(".cfg") && f !== "roles.cfg")
    .map(f => f.replace(".cfg", ""))
}

function get_commands_for_role(role_name: string): string[] {
  const commands    = get_all_permission_files()
  const result: string[] = []

  for (const cmd of commands) {
    const perm = load_permission(cmd)
    if (!perm) continue

    if (perm.roles.includes(role_name)) {
      result.push(cmd)
    }
  }

  return result
}

function build_role_select_message(): component.message_payload {
  const roles   = load_roles()
  const options = Object.keys(roles).map(role_name => ({
    label: role_name.charAt(0).toUpperCase() + role_name.slice(1),
    value: role_name,
    description: `View permissions for ${role_name}`,
  }))

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Role Permissions`,
            `Select a role to view its command permissions.`,
          ]),
          component.divider(),
          component.select_menu("role_permission_select", "Select a role...", options),
        ],
      }),
    ],
  })
}

export async function handle_role_permission_select(
  interaction: any,
  selected_role: string
): Promise<void> {
  await interaction.deferUpdate()

  const roles    = load_roles()
  const role_id  = roles[selected_role]
  const commands = get_commands_for_role(selected_role)

  const command_list = commands.length > 0
    ? commands.map(cmd => {
        const perm   = load_permission(cmd)
        const higher = perm?.allow_higher_roles ? "<:checkmark:1417196825110253780>" : "✗"
        return `\`/${cmd}\` (higher: ${higher})`
      }).join("\n")
    : "No commands assigned"

  const options = Object.keys(roles).map(role_name => ({
    label:       role_name.charAt(0).toUpperCase() + role_name.slice(1),
    value:       role_name,
    description: `View permissions for ${role_name}`,
    default:     role_name === selected_role,
  }))

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Role Permissions`,
            `Viewing permissions for <@&${role_id}>`,
          ]),
          component.divider(),
          component.text([
            `### Commands`,
            command_list,
          ]),
          component.divider(),
          component.select_menu("role_permission_select", "Select a role...", options),
        ],
      }),
    ],
  })

  await api.edit_components_v2(
    interaction.channelId,
    interaction.message.id,
    api.get_token(),
    message
  )
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("get_role_permission")
    .setDescription("View command permissions by role") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const message  = build_role_select_message()
    const response = await api.send_components_v2(
      interaction.channelId!,
      api.get_token(),
      message
    )

    if (response.error) {
      console.log("[get_role_permission] API Error:", JSON.stringify(response, null, 2))
      await interaction.editReply({ content: "Failed to send permission panel." })
    } else {
      await interaction.editReply({ content: "Permission panel sent!" })
    }
  },
}
