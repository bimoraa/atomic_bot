import { Client, Collection, GatewayIntentBits, ActivityType } from "discord.js"
import { config } from "dotenv"
import { Command } from "./types/command"
import { load_commands, register_commands } from "./handlers/command_handler"
import { handle_interaction } from "./events/interaction_create"
import { start_roblox_update_checker } from "./functions/roblox_update"

config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as Client & { commands: Collection<string, Command> }

export { client }

import "./events/guild_member_add"

function get_total_members(): number {
  return client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
}

function update_presence(): void {
  const ping    = client.ws.ping
  const members = get_total_members()

  client.user?.setPresence({
    status: "dnd",
    activities: [{
      name: `Response: ${ping}ms | Members: ${members.toLocaleString()}`,
      type: ActivityType.Watching,
    }],
  })
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`)

  update_presence()
  setInterval(update_presence, 30000)

  const commands_data = await load_commands(client)
  await register_commands(commands_data)

  start_roblox_update_checker(client)

  console.log("Commands registered successfully")
})

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.login(process.env.DISCORD_TOKEN);
