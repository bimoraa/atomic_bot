import { Collection }  from "discord.js"
import { SubCommand }  from "../types/sub_command"
import { readdirSync } from "fs"
import { join }        from "path"

export const sub_commands = new Collection<string, SubCommand>()

export async function load_sub_commands(): Promise<void> {
  const sub_commands_path = join(__dirname, "../sub_commands")
  const files             = readdirSync(sub_commands_path).filter(file => file.endsWith(".ts") || file.endsWith(".js"))

  for (const file of files) {
    const file_path    = join(sub_commands_path, file)
    const sub_command  = (await import(file_path)).default as SubCommand

    if (!sub_command || !sub_command.name || !sub_command.execute) {
      console.log(`[ - SUB COMMAND - ] Invalid sub command file: ${file}`)
      continue
    }

    sub_commands.set(sub_command.name, sub_command)
    console.log(`[ - SUB COMMAND - ] Loaded: ?${sub_command.name}`)
  }

  console.log(`[ - SUB COMMAND - ] Total loaded: ${sub_commands.size}`)
}
