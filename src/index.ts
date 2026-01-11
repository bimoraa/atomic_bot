import { Client, Collection, GatewayIntentBits, ActivityType, Message, PermissionFlagsBits, Partials } from "discord.js"
import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice"
import { config }                                                        from "dotenv"
import { Command }                                                       from "./shared/types/command"
import { load_commands, register_commands }                              from "./core/handlers/command_handler"
import { load_sub_commands, sub_commands }                               from "./core/handlers/sub_command_handler"
import { handle_interaction }                                            from "./core/handlers/interaction_create"
import { handle_auto_reply }                                             from "./shared/database/auto_reply"
import { start_roblox_update_checker }                                   from "./shared/database/roblox_update"
import { load_close_requests }                                           from "./modules/staff/staff/close_request"
import { load_all_tickets, flush_all_tickets }                           from "./shared/database/unified_ticket"
import * as tempvoice                                                    from "./shared/database/tempvoice"
import { register_audit_logs }                                           from "./shared/database/audit_log"
import { handle_afk_return, handle_afk_mentions }                        from "./core/handlers/shared/controller/afk_controller"
import { load_afk_from_db }                                              from "./infrastructure/cache/afk"
import { check_server_tag_change }                                       from "./shared/database/server_tag"
import { start_free_script_checker }                                     from "./shared/database/free_script_manager"
import { start_service_provider_cache, stop_service_provider_cache }     from "./infrastructure/api/service_provider_cache"
import { db, component }                                                 from "./shared/utils"
import { log_error }                                                     from "./shared/utils/error_logger"
import { check_spam }                                                    from "./infrastructure/cache/anti_spam"
import { load_reminders_from_db }                                        from "./modules/reminder/reminder"
import { start_loa_checker }                                             from "./shared/database/loa_checker"
import { start_webhook_server }                                          from "./core/client/server"
import { start_scheduler }                                               from "./modules/staff/staff/schedule_hwid_less"

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

let voice_connection: VoiceConnection | null = null

export { client }

import "./core/handlers/guild_member_add"
import "./core/handlers/guild_member_booster"
import "./core/handlers/voice_state_update"
import "./core/handlers/message_delete"

/**
 * - JOIN VOICE CHANNEL WITH AUTO-RECONNECT - \\
 */
function join_voice_channel(): void {
  const voice_channel_id = "1427737274983907408"
  const guild_id         = "1250337227582472243"
  
  try {
    console.log(`[ - VOICE - ] Attempting to join voice channel ${voice_channel_id}`)
    
    const guild = client.guilds.cache.get(guild_id)
    if (!guild) {
      console.error(`[ - VOICE - ] Guild ${guild_id} not found!`)
      setTimeout(() => join_voice_channel(), 5000)
      return
    }
    
    const voice_channel = guild.channels.cache.get(voice_channel_id)
    if (!voice_channel) {
      console.error(`[ - VOICE - ] Voice channel ${voice_channel_id} not found!`)
      setTimeout(() => join_voice_channel(), 5000)
      return
    }
    
    if (voice_connection) {
      voice_connection.destroy()
    }
    
    voice_connection = joinVoiceChannel({
      channelId      : voice_channel_id,
      guildId        : guild_id,
      adapterCreator : guild.voiceAdapterCreator as any,
      selfDeaf       : true,
      selfMute       : false,
    })
    
    voice_connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log(`[ - VOICE - ] Disconnected from voice channel, attempting to reconnect...`)
      setTimeout(() => join_voice_channel(), 3000)
    })
    
    voice_connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log(`[ - VOICE - ] Connection destroyed`)
    })
    
    voice_connection.on("error", (error) => {
      console.error(`[ - VOICE - ] Connection error:`, error)
      setTimeout(() => join_voice_channel(), 3000)
    })
    
    console.log(`[ - VOICE - ] Successfully joined voice channel ${voice_channel.name} (${voice_channel_id})`)
  } catch (error) {
    console.error("[ - VOICE - ] Failed to join voice channel:", error)
    setTimeout(() => join_voice_channel(), 5000)
  }
}

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
      await load_afk_from_db()
      start_loa_checker(client)
      start_scheduler(client)
      start_free_script_checker(client)
      start_service_provider_cache(client)
      
      // - CLEANUP BYPASS CACHE EVERY 10 MINUTES - \\
      setInterval(() => db.cleanup_expired_bypass_cache(), 10 * 60 * 1000)
    }
  } catch (error) {
    console.error("[PostgreSQL] Connection error:", error)
  }

  join_voice_channel()

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
      await tempvoice.load_saved_settings_from_db(guild.id)
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

client.on("userUpdate", async (old_user, new_user) => {
  await check_server_tag_change(client, old_user, new_user)
})

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return

  await handle_afk_return(message)
  await handle_afk_mentions(message)

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
    console.log("[SIGTERM] Stopping service provider cache...")
    stop_service_provider_cache()
    console.log("[SIGTERM] Flushing ticket saves...")
    await flush_all_tickets()
    console.log("[SIGTERM] Destroying client...")
    await client.destroy()
    console.log("[SIGTERM] Disconnecting database...")
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
    console.log("[SIGINT] Stopping service provider cache...")
    stop_service_provider_cache()
    console.log("[SIGINT] Flushing ticket saves...")
    await flush_all_tickets()
    console.log("[SIGINT] Destroying client...")
    await client.destroy()
    console.log("[SIGINT] Disconnecting database...")
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
