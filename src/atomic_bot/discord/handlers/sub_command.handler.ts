/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 子命令的分发处理器，找到对应子命令然后执行 - \\
// - sub-command dispatcher, looks up the sub-command and runs it - \\
import { Collection }  from "discord.js"
import { SubCommand }  from "@shared/types/sub_command"
import { existsSync, readdirSync } from "fs"
import { join }        from "path"

export const sub_commands = new Collection<string, SubCommand>()

/**
 * - 从模块文件夹加载子命令 - \\
 * - load sub commands from modules folders - \\
 * @returns {Promise<void>}
 */
export async function load_sub_commands(): Promise<void> {
  const commands_root = join(__dirname, "../../features/commands")

  try {
    const feature_dirs = readdirSync(commands_root, { withFileTypes: true })
      .filter((group) => group.isDirectory())
      .flatMap((group) => {
        const group_path = join(commands_root, group.name)

        return readdirSync(group_path, { withFileTypes: true })
          .filter((feature) => feature.isDirectory())
          .map((feature) => ({
            group_name      : group.name,
            feature_name    : feature.name,
            subcommands_path: join(group_path, feature.name, "sub-commands"),
          }))
      })

    for (const feature of feature_dirs) {
      try {
        if (!existsSync(feature.subcommands_path)) {
          continue
        }

        const files = readdirSync(feature.subcommands_path)
          .filter((file) => file.endsWith(".sub-command.js") || file.endsWith(".sub-command.ts"))

        for (const file of files) {
          const file_path = join(feature.subcommands_path, file)
          
          try {
            const imported    = require(file_path)
            const sub_command = (imported.default || imported) as SubCommand

            if (!sub_command || !sub_command.name || typeof sub_command.execute !== "function") {
              console.log(`[ - SUB COMMAND - ] Invalid sub command file: ${file}`)
              continue
            }

            sub_commands.set(sub_command.name, sub_command)
            console.log(`[ - SUB COMMAND - ] Loaded: ?${sub_command.name} from ${feature.group_name}/${feature.feature_name}`)
          } catch (error) {
            console.error(`[ - SUB COMMAND - ] Failed to load ${file}:`, error)
          }
        }
      } catch {
        // - feature 没有 sub_commands 文件夹时跳过 - \\
        // - skip features that do not expose sub_commands - \\
      }
    }
  } catch (error) {
    console.error(`[ - SUB COMMAND - ] Failed to read features directory:`, error)
  }

  console.log(`[ - SUB COMMAND - ] Total loaded: ${sub_commands.size}`)
}
