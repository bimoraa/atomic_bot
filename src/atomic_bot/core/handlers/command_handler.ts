import { Client, Collection, REST, Routes } from "discord.js";
import { Command } from "@shared/types/command";
import { readdirSync } from "fs";
import { join } from "path";
import { client_id, is_dev } from "@startup/atomic_bot";

export async function load_commands(client: Client & { commands: Collection<string, Command> }) {
  client.commands = new Collection();
  const commands_data: object[] = [];

  const commands_path = join(__dirname, "../../modules");
  
  async function load_from_directory(dir_path: string): Promise<void> {
    const items = readdirSync(dir_path, { withFileTypes: true });
    
    for (const item of items) {
      const item_path = join(dir_path, item.name);
      
      if (item.isDirectory()) {
        await load_from_directory(item_path);
      } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".js"))) {
        // - SKIP UTILITY AND HELPER FILES - \\
        if (item.name.includes("_utils") || item.name.includes("_mod_") || item.name.startsWith("afk_set")) {
          continue;
        }

        const imported = await import(item_path);
        const command = imported.default || imported.command;
        
        if (!command?.data) {
          console.warn(`[command_handler] Skipping ${item.name} - no valid command export`);
          continue;
        }
        
        const command_name = command.data.name;
        const command_index = commands_data.length;
        if (commands_data.some((cmd: any) => cmd.name === command_name)) {
          console.warn(`[command_handler] DUPLICATE COMMAND NAME at index ${command_index}: ${command_name} from ${item_path}`);
        }
        console.log(`[${command_index}] ${command_name} from ${item.name}`);
        client.commands.set(command_name, command);
        commands_data.push(command.data.toJSON());
      }
    }
  }
  
  await load_from_directory(commands_path);

  return commands_data;
}

export async function register_commands(commands_data: object[]) {
  const token = is_dev ? process.env.DEV_DISCORD_TOKEN! : process.env.DISCORD_TOKEN!
  const rest = new REST().setToken(token);

  await rest.put(Routes.applicationCommands(client_id!), {
    body: commands_data,
  });
}
