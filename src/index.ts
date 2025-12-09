import { Client, Collection, GatewayIntentBits, ActivityType, Message } from "discord.js"
import { config } from "dotenv"
import { Command } from "./types/command"
import { load_commands, register_commands } from "./handlers/command_handler"
import { handle_interaction } from "./events/interaction_create"
import { start_roblox_update_checker } from "./functions/roblox_update"
import { load_close_requests } from "./commands/tools/close_request"
import { load_all_purchase_tickets } from "./interactions/shared/ticket_state"
import { db } from "./utils"

config()

const is_dev = process.env.NODE_ENV === "development"

const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const client_id = is_dev ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID

export { client_id, is_dev }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as Client & { commands: Collection<string, Command> }

client.commands = new Collection()

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

  const mongo = await db.connect()
  if (mongo) {
    console.log("Connected to MongoDB")
    await load_close_requests()
    await load_all_purchase_tickets()
  }

  update_presence()
  setInterval(update_presence, 3000)

  const commands_data = await load_commands(client)
  await register_commands(commands_data)

  start_roblox_update_checker(client)

  console.log("Commands registered successfully")
})

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return
  if (message.reference) return
  if (message.mentions.has(client.user!)) {
    await message.reply("hi niggaas")
  }
})

console.log(`[MODE] Running in ${is_dev ? "DEVELOPMENT" : "PRODUCTION"} mode`)
client.login(discord_token)
