/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 子命令的分发处理器，找到对应子命令然后执行 - \
// - sub-command dispatcher, looks up the sub-command and runs it - \
import { Collection }  from "discord.js"
import { SubCommand }  from "@shared/types/sub_command"
import { readdirSync, statSync } from "fs"
import { join }        from "path"

export const sub_commands = new Collection<string, SubCommand>()

/**
 * - LOAD SUB COMMANDS FROM MODULES FOLDERS - \\
 * @returns {Promise<void>}
 */
export async function load_sub_commands(): Promise<void> {
  const modules_path = join(__dirname, "../../modules")
  
  try {
    const modules = readdirSync(modules_path)

    for (const mod of modules) {
      const sub_commands_path = join(modules_path, mod, "sub_commands")
      
      try {
        if (statSync(sub_commands_path).isDirectory()) {
          const files = readdirSync(sub_commands_path).filter(file => file.endsWith(".js") || file.endsWith(".ts"))

          for (const file of files) {
            const file_path = join(sub_commands_path, file)
            
            try {
              // - USE REQUIRE FOR COMMONJS MODULES - \\
              const imported    = require(file_path)
              const sub_command = imported.default || imported as SubCommand

              if (!sub_command || !sub_command.name || !sub_command.execute) {
                console.log(`[ - SUB COMMAND - ] Invalid sub command file: ${file}`)
                continue
              }

              sub_commands.set(sub_command.name, sub_command)
              console.log(`[ - SUB COMMAND - ] Loaded: ?${sub_command.name}`)
            } catch (error) {
              console.error(`[ - SUB COMMAND - ] Failed to load ${file}:`, error)
            }
          }
        }
      } catch (e) {
        // - IGNORE IF FOLDER DOESNT EXIST - \\
      }
    }
  } catch (error) {
    console.error(`[ - SUB COMMAND - ] Failed to read modules directory:`, error)
  }

  console.log(`[ - SUB COMMAND - ] Total loaded: ${sub_commands.size}`)
}
