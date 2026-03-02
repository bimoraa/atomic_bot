import { ApplicationCommandType, Client, Collection, REST, Routes } from "discord.js";
import { Command, MessageContextMenuCommand }                        from "@shared/types/command";
import { readdirSync }                                              from "fs";
import { join }                                                     from "path";
import { is_dev }                                                   from "@startup/atomic_bot";

type extended_client = Client & {
  commands                     : Collection<string, Command>
  message_context_menu_commands?: Collection<string, MessageContextMenuCommand>
}

export async function load_commands(client: extended_client) {
  client.commands                     = new Collection()
  client.message_context_menu_commands = new Collection()
  const commands_data: object[]       = []

  const commands_path = join(__dirname, "../../modules")
  
  async function load_from_directory(dir_path: string): Promise<void> {
    const items = readdirSync(dir_path, { withFileTypes: true })
    
    for (const item of items) {
      const item_path = join(dir_path, item.name)
      
      if (item.isDirectory()) {
        await load_from_directory(item_path)
      } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".js"))) {
        // - SKIP UTILITY AND HELPER FILES - \\
        if (item.name.includes("_utils") || item.name.includes("_mod_") || item.name.startsWith("afk_set")) {
          continue
        }

        const imported = await import(item_path)
        const command  = imported.default || imported.command

        if (!command?.data) {
          console.warn(`[command_handler] Skipping ${item.name} - no valid command export`)
          continue
        }

        const command_name  = command.data.name
        const command_index = commands_data.length

        if (commands_data.some((cmd: any) => cmd.name === command_name)) {
          console.warn(`[command_handler] DUPLICATE COMMAND NAME at index ${command_index}: ${command_name} from ${item_path}`)
        }

        // - ROUTE MESSAGE CONTEXT MENU COMMANDS TO SEPARATE COLLECTION - \\
        if (command.data.type === ApplicationCommandType.Message) {
          console.log(`[${command_index}] (ctx-menu) ${command_name} from ${item.name}`)
          client.message_context_menu_commands!.set(command_name, command as MessageContextMenuCommand)
        } else {
          console.log(`[${command_index}] ${command_name} from ${item.name}`)
          client.commands.set(command_name, command as Command)
        }

        commands_data.push(command.data.toJSON())
      }
    }
  }
  
  await load_from_directory(commands_path)

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
