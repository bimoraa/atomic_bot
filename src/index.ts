import { Client, Collection, GatewayIntentBits, ActivityType, Message, PermissionFlagsBits, Partials } from "discord.js"
import { config }                                                        from "dotenv"
import { Command }                                                       from "./types/command"
import { load_commands, register_commands }                              from "./handlers/command_handler"
import { load_sub_commands, sub_commands }                               from "./handlers/sub_command_handler"
import { handle_interaction }                                            from "./events/interaction_create"
import { handle_auto_reply }                                             from "./services/auto_reply"
import { start_roblox_update_checker }                                   from "./services/roblox_update"
import { load_close_requests }                                           from "./commands/tools/staff/close_request"
import { load_all_tickets }                                              from "./services/unified_ticket"
import * as tempvoice                                                    from "./services/tempvoice"
import { register_audit_logs }                                           from "./services/audit_log"
import { handle_afk_return, handle_afk_mentions }                        from "./interactions/shared/controller/afk_controller"
import { db, component }                                                 from "./utils"
import { log_error }                                                     from "./utils/error_logger"
import { check_spam }                                                    from "./services/anti_spam"
import { load_reminders_from_db }                                        from "./commands/tools/reminder/reminder"
import { start_loa_checker }                                             from "./services/loa_checker"
import { start_webhook_server }                                          from "./server"

config()

const is_dev = process.env.NODE_ENV === "development"

const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const client_id     = is_dev ? process.env.DEV_CLIENT_ID     : process.env.CLIENT_ID

export { client_id, is_dev }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
  ],
}) as Client & { commands: Collection<string, Command> }

client.commands = new Collection()

export { client }

import "./events/guild_member_add"
import "./events/guild_member_booster"
import "./events/voice_state_update"
import "./events/message_delete"

function get_total_members(): number {
  return client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
}

function update_presence(): void {
  const ping    = client.ws.ping
  const members = get_total_members()

  client.user?.setPresence({
    status: "dnd",
    activities: [
      {
        name : "Made with ❤️ by Atomic Team",
        type : ActivityType.Custom,
        state: "Made with ❤️ by Atomic Team",
      },
      {
        name: `Response: ${ping}ms | Members: ${members.toLocaleString()}`,
        type: ActivityType.Watching,
      },
    ],
  })
}

client.once("ready", async () => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`)

  try {
    const mongo = await db.connect()
    if (mongo) {
      await load_close_requests()
      await load_all_tickets()
      await load_reminders_from_db(client)
      start_loa_checker(client)
    }
  } catch (error) {
    console.error("[MongoDB] Connection error:", error)
  }

  update_presence()
  setInterval(update_presence, 3000)

  try {
    const commands_data = await load_commands(client)
    await register_commands(commands_data)
    await load_sub_commands()
  } catch (error) {
    console.error("[Commands] Registration failed:", error)
  }

  try {
    start_roblox_update_checker(client)
    for (const guild of client.guilds.cache.values()) {
      await tempvoice.reconcile_tempvoice_guild(guild)
    }
    register_audit_logs(client)
  } catch (error) {
    console.error("[Services] Initialization error:", error)
  }

  console.log("[Bot] Ready")
})

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return

  if (check_spam(message, client)) return

  if (message.content.startsWith("?")) {
    const args         = message.content.slice(1).trim().split(/ +/)
    const command_name = args.shift()?.toLowerCase()

    if (command_name) {
      const sub_command = sub_commands.get(command_name)
      
      if (sub_command) {
        try {
          await sub_command.execute(message, args, client)
        } catch (error) {
          console.error(`[ - SUB COMMAND - ] Error executing ?${command_name}:`, error)
          await log_error(client, error as Error, `Sub Command: ?${command_name}`, {
            user   : message.author.tag,
            guild  : message.guild?.name || "DM",
            channel: message.channel.id,
          }).catch(() => {})
        }
        return
      }
    }
  }

  await handle_afk_return(message)
  await handle_afk_mentions(message)
  
  if (await handle_auto_reply(message, client)) return
  
  if (message.reference) return
  if (message.mentions.has(client.user!)) {
    
  }
})

client.on("error", (error) => {
  console.error("[Client] Error:", error.message)
  log_error(client, error, "Discord Client", {}).catch(() => {})
})

process.on("unhandledRejection", (error: Error) => {
  console.error("[Unhandled Rejection]:", error)
  log_error(client, error, "Unhandled Rejection", {}).catch(() => {})
})

process.on("uncaughtException", (error: Error) => {
  console.error("[Uncaught Exception]:", error)
  log_error(client, error, "Uncaught Exception", {}).catch(() => {})
  process.exit(1)
})

process.on("SIGTERM", async () => {
  console.log("[SIGTERM] Graceful shutdown initiated")
  try {
    await client.destroy()
    await db.disconnect()
    console.log("[SIGTERM] Shutdown complete")
    process.exit(0)
  } catch (error) {
    console.error("[SIGTERM] Error during shutdown:", error)
    process.exit(1)
  }
})

process.on("SIGINT", async () => {
  console.log("[SIGINT] Graceful shutdown initiated")
  try {
    await client.destroy()
    await db.disconnect()
    console.log("[SIGINT] Shutdown complete")
    process.exit(0)
  } catch (error) {
    console.error("[SIGINT] Error during shutdown:", error)
    process.exit(1)
  }
})

console.log(`[Mode] ${is_dev ? "DEV" : "PROD"}`)

if (!discord_token) {
  console.error("[Fatal] Discord token not found")
  process.exit(1)
}

if (discord_token.length < 50) {
  console.error("[Fatal] Invalid Discord token")
  process.exit(1)
}

if (!client_id) {
  console.error("[Fatal] Client ID not found")
  process.exit(1)
}

start_webhook_server(client)

const login_timeout = setTimeout(() => {
  console.error("[Login] Timeout")
  process.exit(1)
}, 30000)

client.login(discord_token)
  .then(() => clearTimeout(login_timeout))
  .catch((error) => {
    clearTimeout(login_timeout)
    console.error("[Login] Failed:", error.message)
    process.exit(1)
  })
