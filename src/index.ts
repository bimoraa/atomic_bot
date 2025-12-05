import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { Command } from "./types/command";
import { load_commands, register_commands } from "./handlers/command_handler";
import { handle_interaction } from "./events/interaction_create";
import { start_roblox_update_checker } from "./functions/roblox_update";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as Client & { commands: Collection<string, Command> };

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const commands_data = await load_commands(client);
  await register_commands(commands_data);

  start_roblox_update_checker(client);

  console.log("Commands registered successfully");
});

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.login(process.env.DISCORD_TOKEN);
