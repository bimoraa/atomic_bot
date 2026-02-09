import { Client, Collection, GatewayIntentBits, ActivityType, Message, PermissionFlagsBits, Partials } from "discord.js"
import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice"
import { config }                                                        from "dotenv"
import { Command }                                                       from "@shared/types/command"
import { load_commands, register_commands }                              from "../atomic_bot/core/handlers/command_handler"
import { load_sub_commands, sub_commands }                               from "../atomic_bot/core/handlers/sub_command_handler"
import { handle_interaction }                                            from "../atomic_bot/core/handlers/interaction_create"
import { handle_auto_reply }                                             from "@shared/database/settings/auto_reply"
import { start_roblox_update_checker }                                   from "@shared/database/services/roblox_update"
import { load_close_requests }                                           from "../atomic_bot/modules/staff/staff/close_request"
import { load_all_tickets, flush_all_tickets }                           from "@shared/database/unified_ticket"
import * as tempvoice                                                    from "@shared/database/services/tempvoice"
import { register_audit_logs }                                           from "@shared/database/services/audit_log"
import { handle_afk_return, handle_afk_mentions }                        from "../atomic_bot/core/handlers/shared/controller/afk_controller"
import { load_afk_from_db, load_afk_ignored_channels_from_db }           from "../atomic_bot/infrastructure/cache/afk"
import { check_server_tag_change }                                       from "@shared/database/settings/server_tag"
import { start_free_script_checker }                                     from "@shared/database/managers/free_script_manager"
import { start_service_provider_cache, stop_service_provider_cache }     from "../atomic_bot/infrastructure/api/service_provider_cache"
import { db, component }                                                 from "@shared/utils"
import { log_error }                                                     from "@shared/utils/error_logger"
import { check_spam }                                                    from "../atomic_bot/infrastructure/cache/anti_spam"
import { load_reminders_from_db }                                        from "../atomic_bot/modules/reminder/reminder"
import { start_loa_checker }                                             from "@shared/database/services/loa_checker"
import { start_invite_logger }                                           from "@shared/database/services/invite_logger"
import { start_webhook_server, set_bot_ready }                           from "../atomic_bot/core/client/server"
import { start_scheduler }                                               from "../atomic_bot/modules/staff/staff/schedule_hwid_less"
import { start_weekly_reset_scheduler }                                  from "../atomic_bot/core/handlers/schedulers/weekly_work_reset"
import { start_quarantine_scheduler }                                    from "../atomic_bot/core/handlers/schedulers/quarantine_release"
import { load_middleman_tickets_on_startup }                             from "../atomic_bot/core/handlers/schedulers/load_middleman_tickets"
import { start_share_settings_forum_scheduler }                          from "../atomic_bot/core/handlers/schedulers/share_settings_forum"
import * as share_settings                                               from "../atomic_bot/core/handlers/shared/controller/share_settings_controller"

config()

const is_dev = process.env.NODE_ENV === "development"

if (!is_dev) {
  console.log = () => {}
}

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
  makeCache            : () => new Collection(),
  sweepers             : {
    messages            : { interval: 3600, lifetime: 1800 },
    users               : { interval: 3600, filter: () => user => user.bot && user.id !== client.user?.id },
    guildMembers        : { interval: 3600, filter: () => member => member.id !== client.user?.id },
    threadMembers       : { interval: 3600, filter: () => () => true },
    presences           : { interval: 300, filter: () => () => true },
    emojis              : { interval: 3600, filter: () => () => true },
    stickers            : { interval: 3600, filter: () => () => true },
    invites             : { interval: 3600, filter: () => () => true },
    bans                : { interval: 3600, filter: () => () => true },
    applicationCommands : { interval: 3600, filter: () => () => true },
    autoModerationRules : { interval: 3600, filter: () => () => true },
    stageInstances      : { interval: 3600, filter: () => () => true },
  },
  presence: {
    status    : "dnd",
    activities: [{
      name : "Made with ❤️ by Atomic Team",
      type : ActivityType.Custom,
      state: "Made with ❤️ by Atomic Team",
    }],
  },
  rest: {
    timeout         : 30000,
    retries         : 3,
    rejectOnRateLimit: () => false,
  },
  shards              : "auto",
  failIfNotExists     : false,
  allowedMentions     : {
    parse          : ["users", "roles"],
    repliedUser    : true,
  },
}) as Client & { commands: Collection<string, Command> }

client.commands = new Collection()

let voice_connection: VoiceConnection | null = null

export { client }

import "../atomic_bot/core/handlers/events/guild_member/guild_member_add"
import "../atomic_bot/core/handlers/events/guild_member/guild_member_booster"
import "../atomic_bot/core/handlers/events/voice/voice_state_update"
import "../atomic_bot/core/handlers/events/message/message_delete"

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
  if (login_timeout) {
    clearTimeout(login_timeout)
    login_timeout = null
  }
  
  console.log(`[ - BOT - ] Logged in as ${client.user?.tag}`)
  console.log(`[ - BOT - ] Guilds: ${client.guilds.cache.size}`)
  console.log(`[ - BOT - ] Users: ${client.users.cache.size}`)
  console.log(`[ - BOT - ] Ping: ${client.ws.ping}ms`)
  console.log(`[ - BOT - ] Shards: ${client.ws.shards.size}`)

  try {
    const mongo = await db.connect()
    if (mongo) {
      await load_close_requests()
      await load_all_tickets()
      await load_middleman_tickets_on_startup(client)
      await load_reminders_from_db(client)
      await load_afk_from_db()
      await load_afk_ignored_channels_from_db()
      start_loa_checker(client)
      start_scheduler(client)
      start_weekly_reset_scheduler()
      start_quarantine_scheduler(client)
      start_free_script_checker(client)
      start_service_provider_cache(client)
      start_share_settings_forum_scheduler(client)
    }
  } catch (error) {
    console.error("[PostgreSQL] Connection error:", error)
  }

  join_voice_channel()

  update_presence()
  setInterval(update_presence, 60000)

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
    await start_invite_logger(client)
  } catch (error) {
    console.error("[Services] Initialization error:", error)
  }

  set_bot_ready(true)
  console.log("[Bot] Ready and accepting connections")
})

client.on("interactionCreate", (interaction) => {
  handle_interaction(interaction, client);
});

client.on("userUpdate", async (old_user, new_user) => {
  await check_server_tag_change(client, old_user, new_user)
})

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return

  if (message.channel.isThread() && message.channel.parentId === share_settings.get_forum_channel_id()) {
    const record = await share_settings.get_settings_by_forum_thread_id(client, message.channel.id)
    if (record) {
      await share_settings.update_forum_thread_sticky(client, message.channel.id, record)
    }
  }

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

// - WEBSOCKET RECONNECTION HANDLING - \\
client.ws.on("disconnect" as any, () => {
  console.log("[WebSocket] Disconnected from Discord gateway")
  set_bot_ready(false)
})

client.ws.on("resumed" as any, () => {
  console.log("[WebSocket] Resumed connection to Discord gateway")
  set_bot_ready(true)
})

client.ws.on("ready" as any, () => {
  console.log("[WebSocket] WebSocket ready")
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

let login_timeout: NodeJS.Timeout | null = setTimeout(() => {
  console.error("[Login] Timeout - failed to receive ready event within 60 seconds")
  process.exit(1)
}, 60000)

client.login(discord_token)
  .catch((error) => {
    if (login_timeout) clearTimeout(login_timeout)
    console.error("[Login] Failed:", error.message)
    process.exit(1)
  })
