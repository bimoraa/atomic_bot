import { Client, Collection, REST, Routes } from "discord.js";
import { Command } from "../types/command";
import { readdirSync } from "fs";
import { join } from "path";
import { client_id, is_dev } from "../index";

export async function load_commands(client: Client & { commands: Collection<string, Command> }) {
  client.commands = new Collection();
  const commands_data: object[] = [];

  const commands_path = join(__dirname, "../commands");
  const categories = readdirSync(commands_path);

  for (const category of categories) {
    const category_path = join(commands_path, category);
    const command_files = readdirSync(category_path).filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    for (const file of command_files) {
      const file_path = join(category_path, file);
      const imported = await import(file_path);
      const command = imported.default || imported.command;
      
      if (!command?.data) {
        console.warn(`[command_handler] Skipping ${file} - no valid command export`);
        continue;
      }
      
      client.commands.set(command.data.name, command);
      commands_data.push(command.data.toJSON());
    }
  }

  return commands_data;
}

export async function register_commands(commands_data: object[]) {
  const token = is_dev ? process.env.DEV_DISCORD_TOKEN! : process.env.DISCORD_TOKEN!
  const rest = new REST().setToken(token);

  await rest.put(Routes.applicationCommands(client_id!), {
    body: commands_data,
  });
}
