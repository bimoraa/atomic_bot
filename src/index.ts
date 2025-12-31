import { Client, Collection, GatewayIntentBits, ActivityType, Message, PermissionFlagsBits, Partials } from "discord.js"
import { config }                                                        from "dotenv"
import { Command }                                                       from "./types/command"
import { load_commands, register_commands }                              from "./handlers/command_handler"
import { handle_interaction }                                            from "./events/interaction_create"
import { handle_auto_reply }                                             from "./services/auto_reply"
import { start_roblox_update_checker }                                   from "./services/roblox_update"
import { load_close_requests }                                           from "./commands/tools/staff/close_request"
import { load_all_tickets }                                              from "./services/unified_ticket"
import * as tempvoice                                                    from "./services/tempvoice"
import { register_audit_logs }                                           from "./services/audit_log"
import { get_afk, remove_afk, is_afk }                                   from "./services/afk"
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
  console.log(`Logged in as ${client.user?.tag}`)

  try {
    const mongo = await db.connect()
    if (mongo) {
      console.log("Connected to MongoDB")
      await load_close_requests()
      await load_all_tickets()
      await load_reminders_from_db(client)
      start_loa_checker(client)
    } else {
      console.error("Failed to connect to MongoDB")
    }
  } catch (error) {
    console.error("MongoDB connection error:", error)
  }

  update_presence()
  setInterval(update_presence, 3000)

  try {
    const commands_data = await load_commands(client)
    await register_commands(commands_data)
    console.log("Commands registered successfully")
  } catch (error) {
    console.error("Failed to register commands:", error)
  }

  try {
    start_roblox_update_checker(client)
  } catch (error) {
    console.error("Failed to start roblox update checker:", error)
  }

  try {
    for (const guild of client.guilds.cache.values()) {
      await tempvoice.reconcile_tempvoice_guild(guild)
    }
  } catch (error) {
    console.error("Failed to reconcile tempvoice:", error)
  }

  try {
    register_audit_logs(client)
  } catch (error) {
    console.error("Failed to register audit logs:", error)
  }

  console.log("Bot is ready and running")
})

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return

  if (check_spam(message, client)) return

  const afk_removed = remove_afk(message.author.id)
  if (afk_removed) {
    const member = message.guild?.members.cache.get(message.author.id)
    if (member) {
      try {
        await member.setNickname(afk_removed.original_nickname)
      } catch {}
    }
    
    const welcome_back = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : `Welcome back! You were AFK for <t:${Math.floor(afk_removed.timestamp / 1000)}:R>`,
              thumbnail: message.author.displayAvatarURL({ extension: "png", size: 256 }),
            }),
          ],
        }),
      ],
    })
    await message.reply(welcome_back)
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
      .catch(() => {})
  }

  for (const mentioned of message.mentions.users.values()) {
    if (is_afk(mentioned.id)) {
      const afk_data = get_afk(mentioned.id)
      if (afk_data) {
        const afk_notice = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content  : `<@${mentioned.id}> is currently AFK: **${afk_data.reason}** - <t:${Math.floor(afk_data.timestamp / 1000)}:R>`,
                  thumbnail: mentioned.displayAvatarURL({ extension: "png", size: 256 }),
                }),
              ],
            }),
          ],
        })
        await message.reply({ ...afk_notice, allowedMentions: { users: [] } })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000))
          .catch(() => {})
        break
      }
    }
  }
  
  if (await handle_auto_reply(message, client)) return
  
  if (message.reference) return
  if (message.mentions.has(client.user!)) {
    
  }
})

client.on("error", (error) => {
  console.error("[Discord Client] Error:", error)
  log_error(client, error, "Discord Client", {}).catch(() => {})
})

client.on("warn", (warning) => {
  console.warn("[Discord Client] Warning:", warning)
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

console.log(`[MODE] Running in ${is_dev ? "DEVELOPMENT" : "PRODUCTION"} mode`)

if (!discord_token) {
  console.error("[Discord] FATAL: Discord token not found")
  console.error(`[Discord] Please set ${is_dev ? "DEV_DISCORD_TOKEN" : "DISCORD_TOKEN"} environment variable`)
  process.exit(1)
}

if (discord_token.length < 50) {
  console.error("[Discord] FATAL: Discord token appears to be invalid (too short)")
  console.error(`[Discord] Token length: ${discord_token.length} characters`)
  process.exit(1)
}

if (!client_id) {
  console.error("[Discord] FATAL: Client ID not found")
  console.error(`[Discord] Please set ${is_dev ? "DEV_CLIENT_ID" : "CLIENT_ID"} environment variable`)
  process.exit(1)
}

console.log("[Discord] Environment check passed")
console.log(`[Discord] Token: ${discord_token.substring(0, 10)}...`)
console.log(`[Discord] Client ID: ${client_id}`)

console.log("[Discord] Starting HTTP server...")
start_webhook_server(client)

console.log("[Discord] Attempting to login...")

const login_timeout = setTimeout(() => {
  console.error("[Discord] Login timeout after 30 seconds")
  console.error("[Discord] This usually means:")
  console.error("[Discord] 1. Invalid Discord token")
  console.error("[Discord] 2. Network connectivity issues")
  console.error("[Discord] 3. Discord API is down")
  process.exit(1)
}, 30000)

client.login(discord_token)
  .then(() => {
    clearTimeout(login_timeout)
    console.log("[Discord] Login successful")
  })
  .catch((error) => {
    clearTimeout(login_timeout)
    console.error("[Discord] Login failed:", error)
    console.error("[Discord] Error details:", error.message)
    if (error.code) {
      console.error("[Discord] Error code:", error.code)
    }
    process.exit(1)
  })
