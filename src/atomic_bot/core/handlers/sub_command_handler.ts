import { Collection }  from "discord.js"
import { SubCommand }  from "@shared/types/sub_command"
import { readdirSync } from "fs"
import { join }        from "path"

export const sub_commands = new Collection<string, SubCommand>()

/**
 * - LOAD SUB COMMANDS FROM SHARED FOLDER - \\
 * @returns {Promise<void>}
 */
export async function load_sub_commands(): Promise<void> {
  const sub_commands_path = join(__dirname, "../../../shared/sub_commands")
  
  // - ONLY LOAD .js FILES IN PRODUCTION (dist folder) - \\
  const files = readdirSync(sub_commands_path).filter(file => file.endsWith(".js"))

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

  console.log(`[ - SUB COMMAND - ] Total loaded: ${sub_commands.size}`)
}
