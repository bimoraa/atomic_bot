/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Collection, GatewayIntentBits, ActivityType, Message, PermissionFlagsBits, Partials } from "discord.js"
import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice"
import { config }                                                        from "dotenv"
import { Command }                                                       from "@shared/types/command"
import { load_commands, register_commands }                              from "@atomic/discord/handlers/command.handler"
import { handle_interaction }                                            from "@atomic/discord/router"
import { load_sub_commands, sub_commands }                               from "@atomic/discord/handlers/sub_command.handler"
import { handle_auto_reply }                                             from "@shared/database/settings/auto_reply"
import { start_roblox_update_checker }                                   from "@shared/database/services/roblox_update"
import { load_close_requests }                                           from "@atomic/features/commands/staff-management/staff/close_request.commands"
import { load_all_tickets, flush_all_tickets }                           from "@shared/database/unified_ticket"
import * as tempvoice                                                    from "@shared/database/services/tempvoice"
import { register_audit_logs }                                           from "@shared/database/services/audit_log"
import { handle_afk_return, handle_afk_mentions }                        from "@atomic/features/commands/server-util/afk/controller/afk.controller"
import { load_afk_from_db, load_afk_ignored_channels_from_db }           from "@atomic/integrations/cache/afk"
import { check_server_tag_change, scan_banned_tags_on_startup }           from "@shared/database/settings/server_tag"
import { start_free_script_checker }                                     from "@shared/database/managers/free_script.manager"
import { start_service_provider_cache, stop_service_provider_cache }     from "@atomic/integrations/api/service_provider_cache"
import { db, component }                                                 from "@shared/utils"
import { log_error }                                                     from "@shared/utils/error_logger"
import { check_spam }                                                    from "@atomic/integrations/cache/anti_spam"
import { load_reminders_from_db }                                        from "@atomic/features/commands/server-util/reminder/reminder.commands"
import { start_loa_checker }                                             from "@shared/database/services/loa_checker"
import { start_invite_logger }                                           from "@shared/database/services/invite_logger"
import { start_webhook_server, set_bot_ready, warm_credits_cache_from_db }           from "@atomic/http/server"
import { start_scheduler }                                               from "@atomic/features/commands/staff-management/staff/schedule_hwid_less.commands"
import { start_weekly_reset_scheduler }                                  from "@atomic/features/commands/staff-management/work/jobs/weekly_work_reset.job"
import { start_quarantine_scheduler }                                    from "@atomic/features/commands/moderation/quarantine/jobs/quarantine_release.job"
import { start_tag_quarantine_checker }                                  from "@atomic/features/commands/moderation/quarantine/jobs/tag_quarantine_checker.job"
import { is_quarantined, get_all_quarantines }                          from "@shared/database/managers/quarantine.manager"
import { start_account_tracker_offline_checker }                         from "@atomic/features/commands/server-util/account-tracker/jobs/account_tracker_offline.job"
import { load_middleman_tickets_on_startup }                             from "@atomic/features/commands/commerce/middleman/jobs/load_middleman_tickets.job"
import { start_share_settings_forum_scheduler }                          from "@atomic/features/commands/commerce/share-settings/jobs/share_settings_forum.job"
import * as share_settings                                               from "@atomic/features/commands/commerce/share-settings/controller/share_settings.controller"
import { recover_active_sessions }                                       from "@atomic/features/commands/staff-management/staff/controller/staff_voice.controller"
import { init_shoukaku }                                                 from "@atomic/integrations/lavalink/shoukaku"
import { handle_music_prefix_command }                                   from "@atomic/features/commands/media/music/controller/prefix.controller"
import { handle_security_automod_message }                               from "@atomic/features/commands/moderation/security/controller/security_automod.controller"

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
let typing_interval: NodeJS.Timeout | null = null

const __persistent_typing_channel_id  = "1257034070035267636"
const __persistent_typing_interval_ms = 8000

// - 缓存的打字频道引用，避免每8秒都发一次REST请求 - \\
// - cached typing channel ref, avoids REST fetch every 8 seconds - \\
let __cached_typing_channel: any = null

export { client }

// - 初始化 Lavalink/Shoukaku 音乐客户端 - \\
// - initialize Lavalink/Shoukaku music client - \\
if (process.env.LAVALINK_HOST) {
  init_shoukaku(client)
}

import "@atomic/discord/events/guild_member/guild_member_add"
import "@atomic/discord/events/guild_member/guild_member_booster"
import "@atomic/discord/events/voice/voice_state_update"
import "@atomic/discord/events/message/message_delete"
import "@atomic/discord/events/message/executor_update"

/**
 * - 进语音频道，断了会自动重连，主打一个稳 - \\
 * - join voice channel with auto-reconnect, keeping it steady - \\
 */
async function join_voice_channel(): Promise<void> {
  const voice_channel_id = "1427737274983907408"
  const guild_id         = "1250337227582472243"

  try {
    console.log(`[ - VOICE - ] Attempting to join voice channel ${voice_channel_id}`)

    const guild = await client.guilds.fetch(guild_id).catch(() => null)
    if (!guild) {
      console.error(`[ - VOICE - ] Guild ${guild_id} not found!`)
      setTimeout(() => { void join_voice_channel() }, 5000)
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

    voice_connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log(`[ - VOICE - ] Disconnected, reconnecting...`)
      setTimeout(() => { void join_voice_channel() }, 3000)
    })

    voice_connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log(`[ - VOICE - ] Connection destroyed`)
    })

    voice_connection.on("error", (error) => {
      console.error(`[ - VOICE - ] Connection error:`, error)
      setTimeout(() => { void join_voice_channel() }, 3000)
    })

    console.log(`[ - VOICE - ] Successfully joined voice channel ${voice_channel_id}`)
  } catch (error) {
    console.error("[ - VOICE - ] Failed to join voice channel:", error)
    setTimeout(() => { void join_voice_channel() }, 5000)
  }
}

// - memberCount迭代缓存永远空，直接返回0 - \\
// - guilds cache is always empty, skip the reduce entirely - \\
function get_total_members(): number {
  return 0
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

/**
 * - 频道里一直显示「正在输入」，主打一个在忙 - \\
 * - start persistent typing, keeping that typing status up - \\
 * @returns {Promise<void>}
 */
async function start_persistent_typing(): Promise<void> {
  if (typing_interval) {
    clearInterval(typing_interval)
    typing_interval = null
  }

  const send_typing = async (): Promise<void> => {
    try {
      if (!__cached_typing_channel) {
        __cached_typing_channel = await client.channels.fetch(__persistent_typing_channel_id).catch(() => null)
      }

      const channel = __cached_typing_channel
      if (!channel || !("sendTyping" in channel)) {
        __cached_typing_channel = null
        return
      }

      await (channel as any).sendTyping()
    } catch (error) {
      __cached_typing_channel = null
      console.error("[ - TYPING - ] Failed to send typing:", error)
      await log_error(client, error as Error, "persistent_typing_loop", {
        channel_id : __persistent_typing_channel_id,
      })
    }
  }

  await send_typing()
  typing_interval = setInterval(() => {
    void send_typing()
  }, __persistent_typing_interval_ms)

  console.log(`[ - TYPING - ] Persistent typing started in channel ${__persistent_typing_channel_id}`)
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
      warm_credits_cache_from_db().catch(() => {})
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
      start_tag_quarantine_checker(client)
      start_account_tracker_offline_checker(client)
      scan_banned_tags_on_startup(client).catch(() => {})

      // - 启动时扫描所有被隔离成员，若缺少隔离角色则立即重新应用 - \\
      // - on startup rescan all quarantined members and re-apply quarantine role if missing - \\
      const __startup_quarantine_role = process.env.QUARANTINE_ROLE_ID ?? "1265318689130024992"
      get_all_quarantines().then(async (records) => {
        for (const record of records) {
          try {
            const guild = await client.guilds.fetch(record.guild_id).catch(() => null)
            if (!guild) continue

            const member = await guild.members.fetch(record.user_id).catch(() => null)
            if (!member) continue

            // - 成员已有隔离角色，无需处理 - \\
            // - member already has quarantine role, skip - \\
            const has_quarantine = member.roles.cache.has(__startup_quarantine_role)
            if (has_quarantine) continue

            const managed_roles = member.roles.cache
              .filter(r => r.managed || r.id === guild.id)
              .map(r => r.id)

            await member.roles.set(
              [...managed_roles, __startup_quarantine_role],
              "Startup quarantine rescan: quarantine role was missing"
            ).catch(() => {})

            console.log(`[ - QUARANTINE RESCAN - ] re-applied quarantine for ${member.user.tag}`)
          } catch (err) {
            await log_error(client, err as Error, "Startup Quarantine Rescan", {
              user_id  : record.user_id,
              guild_id : record.guild_id,
            }).catch(() => {})
          }
        }
      }).catch(() => {})
      start_free_script_checker(client)
      start_service_provider_cache(client)
      start_share_settings_forum_scheduler(client)
      recover_active_sessions(client).catch(() => {})
    }
  } catch (error) {
    console.error("[PostgreSQL] Connection error:", error)
  }

  void join_voice_channel()
  await start_persistent_typing()

  update_presence()
  setInterval(update_presence, 60000)

  try {
    const commands_data = await load_commands(client)
    const app_id         = client.application!.id
    await register_commands(commands_data, app_id)
    await load_sub_commands()
  } catch (error) {
    console.error("[Commands] Registration failed:", error)
  }

  try {
    start_roblox_update_checker(client)
    const all_guilds = await client.guilds.fetch().catch(() => null)
    if (all_guilds) {
      for (const [guild_id] of all_guilds) {
        const guild = await client.guilds.fetch(guild_id).catch(() => null)
        if (!guild) continue
        await tempvoice.reconcile_tempvoice_guild(guild)
        await tempvoice.load_saved_settings_from_db(guild.id)
      }
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
  handle_interaction(interaction, client)
})

client.on("userUpdate", async (old_user, new_user) => {
  await check_server_tag_change(client, old_user, new_user)
})

// - 隔离守卫：若被隔离成员被添加角色，立即移除并恢复隔离角色 - \\
// - quarantine guard: if a quarantined member receives a role, strip it and re-apply quarantine - \\
const __quarantine_guard_lock = new Set<string>()

client.on("guildMemberUpdate", async (old_member, new_member) => {
  try {
    // - 只处理角色增加的情况 - \\
    // - only process when roles were added - \\
    if (new_member.roles.cache.size <= old_member.roles.cache.size) return

    const lock_key = `${new_member.guild.id}:${new_member.id}`
    if (__quarantine_guard_lock.has(lock_key)) return
    __quarantine_guard_lock.add(lock_key)

    try {
      const quarantined = await is_quarantined(new_member.id, new_member.guild.id)
      if (!quarantined) return

      // - 强制拉取最新成员数据 - \\
      // - force-fetch fresh member to ensure accurate role list - \\
      const fresh = await new_member.guild.members.fetch({ user: new_member.id, force: true }).catch(() => null)
      if (!fresh) return

      const __quarantine_role = process.env.QUARANTINE_ROLE_ID ?? "1265318689130024992"

      const managed_roles = fresh.roles.cache
        .filter(r => r.managed || r.id === fresh.guild.id)
        .map(r => r.id)

      // - 移除所有非 managed 角色，只保留隔离角色 - \\
      // - strip all non-managed roles, keep only quarantine role - \\
      await fresh.roles.set(
        [...managed_roles, __quarantine_role],
        "Quarantine guard: role added while member was quarantined"
      ).catch(() => {})

      console.log(`[ - QUARANTINE GUARD - ] re-applied quarantine for ${fresh.user.tag}`)
    } finally {
      __quarantine_guard_lock.delete(lock_key)
    }
  } catch (err) {
    await log_error(client, err as Error, "Quarantine Guard — GuildMemberUpdate", {
      user_id  : new_member.id,
      guild_id : new_member.guild.id,
    }).catch(() => {})
  }
})

// - 成员重新加入时，若仍在隔离记录中则立即重新应用隔离角色 - \\
// - on rejoin, re-apply quarantine role if the member still has an active quarantine record - \\
client.on("guildMemberAdd", async (member) => {
  try {
    const quarantined = await is_quarantined(member.id, member.guild.id)
    if (!quarantined) return

    const __quarantine_role = process.env.QUARANTINE_ROLE_ID ?? "1265318689130024992"

    const managed_roles = member.roles.cache
      .filter(r => r.managed || r.id === member.guild.id)
      .map(r => r.id)

    await member.roles.set(
      [...managed_roles, __quarantine_role],
      "Quarantine guard: member rejoined while still quarantined"
    ).catch(() => {})

    console.log(`[ - QUARANTINE GUARD - ] re-applied quarantine on rejoin for ${member.user.tag}`)
  } catch (err) {
    await log_error(client, err as Error, "Quarantine Guard — GuildMemberAdd", {
      user_id  : member.id,
      guild_id : member.guild.id,
    }).catch(() => {})
  }
})

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return

  if (message.channel.isThread() && message.channel.parentId === share_settings.get_forum_channel_id()) {
    const record = await share_settings.get_settings_by_forum_thread_id(client, message.channel.id)
    if (record) {
      await share_settings.update_forum_thread_sticky(client, message.channel.id, record)
    }
  }

  await Promise.all([
    handle_afk_return(message),
    handle_afk_mentions(message),
  ])

  if (check_spam(message, client)) return
  if (await handle_security_automod_message(message, client)) return

  // - 音乐命令前缀 (a!play, a!skip, a!stop, a!pause, a!resume, a!queue) - \\
  // - music prefix commands (a!play, a!skip, a!stop, a!pause, a!resume, a!queue) - \\
  if (message.content.startsWith("a!")) {
    if (await handle_music_prefix_command(message, client)) return
  }

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

// - 掉线重连处理，别让 Webhook 断了联系 - \\
// - websocket reconnection handling, stay connected - \\
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
