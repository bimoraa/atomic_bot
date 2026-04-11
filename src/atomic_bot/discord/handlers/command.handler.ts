/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 斜杠命令的分发处理器，找到命令然后执行 - \\
// - slash command dispatcher, looks up the command and runs it - \\
import { ApplicationCommandType, Client, Collection, REST, Routes } from "discord.js"
import { Command, MessageContextMenuCommand }                        from "@shared/types/command"
import { existsSync, readdirSync }                                   from "fs"
import { join }                                                      from "path"
import { is_dev }                                                    from "@startup/atomic_bot"

type extended_client = Client & {
  commands                     : Collection<string, Command>
  message_context_menu_commands?: Collection<string, MessageContextMenuCommand>
}

function collect_command_files(base_path: string): string[] {
  if (!existsSync(base_path)) {
    return []
  }

  const files: string[] = []
  const items           = readdirSync(base_path, { withFileTypes: true })

  for (const item of items) {
    const item_path = join(base_path, item.name)

    if (item.isDirectory()) {
      files.push(...collect_command_files(item_path))
      continue
    }

    if (
      item.isFile() &&
      (
        item.name.endsWith(".commands.ts") ||
        item.name.endsWith(".commands.js") ||
        item.name.endsWith(".command.ts") ||
        item.name.endsWith(".command.js")
      )
    ) {
      files.push(item_path)
    }
  }

  return files
}

export async function load_commands(client: extended_client) {
  client.commands                     = new Collection()
  client.message_context_menu_commands = new Collection()
  const commands_data: object[]       = []

  const commands_root = join(__dirname, "../../features/commands")
  const command_feature_dirs = readdirSync(commands_root, { withFileTypes: true })
    .filter((group) => group.isDirectory())
    .flatMap((group) => {
      const group_path = join(commands_root, group.name)

      return readdirSync(group_path, { withFileTypes: true })
        .filter((feature) => feature.isDirectory())
        .map((feature) => ({
          group_name  : group.name,
          feature_name: feature.name,
          feature_path: join(group_path, feature.name),
        }))
    })

  for (const feature of command_feature_dirs) {
    const command_files = collect_command_files(feature.feature_path)

    if (!existsSync(feature.feature_path) || command_files.length === 0) {
      continue
    }

    for (const command_path of command_files) {
      const imported = require(command_path)
      const command  = imported.default || imported.command

      if (!command?.data || typeof command.execute !== "function" || typeof command.data.toJSON !== "function") {
        continue
      }

      const command_name  = command.data.name
      const command_index = commands_data.length
      const feature_label = `${feature.group_name}/${feature.feature_name}`

      if (commands_data.some((cmd: any) => cmd.name === command_name)) {
        console.warn(`[command_handler] DUPLICATE COMMAND NAME at index ${command_index}: ${command_name} from ${command_path}`)
      }

      if (command.data.type === ApplicationCommandType.Message) {
        console.log(`[${command_index}] (ctx-menu) ${command_name} from ${feature_label}`)
        client.message_context_menu_commands!.set(command_name, command as MessageContextMenuCommand)
      } else {
        console.log(`[${command_index}] ${command_name} from ${feature_label}`)
        client.commands.set(command_name, command as Command)
      }

      commands_data.push(command.data.toJSON())
    }
  }

  return commands_data
}

/**
 * @param commands_data - Serialized slash command payloads
 * @param app_id - Application ID taken from the authenticated client (client.application.id)
 */
export async function register_commands(commands_data: object[], app_id: string) {
  const token = is_dev ? process.env.DEV_DISCORD_TOKEN! : process.env.DISCORD_TOKEN!
  const rest  = new REST().setToken(token)

  console.log(`[ - COMMANDS - ] Registering ${commands_data.length} commands for app ${app_id}`)
  await rest.put(Routes.applicationCommands(app_id), { body: commands_data })
}
