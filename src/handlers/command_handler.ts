import { Client, Collection, REST, Routes } from "discord.js";
import { Command } from "../types/command";
import { readdirSync } from "fs";
import { join } from "path";

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
      const { command } = await import(file_path);
      client.commands.set(command.data.name, command);
      commands_data.push(command.data.toJSON());
    }
  }

  return commands_data;
}

export async function register_commands(commands_data: object[]) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
    body: commands_data,
  });
}
