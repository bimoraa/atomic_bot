/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Collection, GatewayIntentBits, ActivityType, REST, Routes, Message, Partials } from "discord.js"
import { config } from "dotenv"
import { Command } from "@shared/types/command"
import { log_error } from "@utils/error_logger"
import { db } from "@utils"
import { readdirSync } from "fs"
import { join } from "path"
import { handle_auto_bypass, recover_stuck_bypass_sessions } from "@bypass/modules/bypass/events/auto_bypass"
import { handle_bypass_mobile_copy } from "@bypass/modules/bypass/interactions/buttons/bypass_mobile_copy"
import { handle_bypass_request_log } from "@bypass/modules/bypass/interactions/buttons/bypass_request_log"
import { handle_bypass_support_type_select } from "@bypass/modules/support/interactions/select_menus/bypass_support_type_select"
import { run_middleware } from "@shared/middleware/runner"
import { error_handler } from "@shared/middleware/error.handler"

config()

const is_production = process.env.NODE_ENV === "production"
if (is_production) {
  console.log = () => { }
}

const bypass_token = process.env.BYPASS_DISCORD_TOKEN!
const bypass_client_id = process.env.BYPASS_CLIENT_ID!

if (!bypass_token || !bypass_client_id) {
  console.warn("[ - BYPASS - ] Token not configured, skipping bypass bot startup")
  process.exit(0)
}

// - 自动绕过需要消息内容意图 - \\
// - message content intent is required for auto bypass - \\
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
  ],
  presence: {
    status: "dnd",
    activities: [{
      name: "Atomic-7",
      type: ActivityType.Custom,
      state: "Made with ❤️ by Atomic-7",
    }],
  },
}) as Client & { commands: Collection<string, Command> }

client.commands = new Collection()

/**
 * @param client - Discord client instance
 * @returns Array of command data for registration
 */
async function load_bypass_commands(client: Client & { commands: Collection<string, Command> }): Promise<object[]> {
  const commands_data: object[] = []
  const modules_path = join(__dirname, "../bypass_bot/modules")

  async function load_from_directory(dir_path: string): Promise<void> {
    const items = readdirSync(dir_path, { withFileTypes: true })

    for (const item of items) {
      const item_path = join(dir_path, item.name)

      if (item.isDirectory()) {
        if (item.name === "interactions") continue
        await load_from_directory(item_path)
      } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".js"))) {
        const imported = await import(item_path)
        const command  = imported.default || imported.command

        if (!command?.data) {
          console.warn(`[ - BYPASS - ] Skipping ${item.name} - no valid command export`)
          continue
        }

        const command_name = command.data.name
        console.warn(`[ - BYPASS - ] Loaded: ${command_name}`)
        client.commands.set(command_name, command)
        commands_data.push(command.data.toJSON())
      }
    }
  }

  await load_from_directory(modules_path)

  return commands_data
}

/**
 * @param commands_data - Array of command data to register
 */
async function register_bypass_commands(commands_data: object[]): Promise<void> {
  const rest = new REST().setToken(bypass_token)

  await rest.put(Routes.applicationCommands(bypass_client_id), {
    body: commands_data,
  })

  console.warn(`[ - BYPASS - ] Registered ${commands_data.length} commands`)
}

// - 机器人的就绪事件，准备开工 - \\
// - client ready event, locked and loaded - \\
client.once("ready", async () => {
  console.warn(`[ - BYPASS - ] Bot logged in as ${client.user?.tag}`)
  console.warn(`[ - BYPASS - ] Serving ${client.guilds.cache.size} guilds`)

  try {
    const commands_data = await load_bypass_commands(client)
    await register_bypass_commands(commands_data)
  } catch (error) {
    console.error("[ - BYPASS - ] Failed to load/register commands:", error)
  }

  // - 连数据库并清理过期合法的绕过缓存 - \\
  // - connect to database & cleanup expired bypass cache - \\
  try {
    await db.connect()
    setInterval(() => db.cleanup_expired_bypass_cache(), 10 * 60 * 1000)

    // - 恢复重启前卡住的会话 - \\
    // - recover sessions stuck before restart - \\
    await recover_stuck_bypass_sessions(client)
  } catch (error) {
    console.error("[ - BYPASS - ] Database connection error:", error)
  }
})

// - 交互事件处理，按钮、菜单、指令都在这 - \\
// - interaction create event, all the fun stuff - \\
client.on("interactionCreate", async (interaction) => {
  // - 按钮点点点处理器 - \\
  // - button handlers - \\
  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith("bypass_mobile_copy:")) {
        await handle_bypass_mobile_copy(interaction)
        return
      }
      if (interaction.customId.startsWith("bypass_request_log:")) {
        await handle_bypass_request_log(interaction)
        return
      }
    } catch (error) {
      console.error("[ - BYPASS - ] Button error:", error)
      await log_error(client, error as Error, `Bypass Button: ${interaction.customId}`, {
        user: interaction.user.tag,
        guild: interaction.guild?.name || "DM",
        channel: interaction.channel?.id,
      })
    }
  }

  // - 下拉菜单处理器 - \\
  // - select menu handlers - \\
  if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.customId.startsWith("bypass_support_type_select:")) {
        await handle_bypass_support_type_select(interaction)
        return
      }
    } catch (error) {
      console.error("[ - BYPASS - ] Select menu error:", error)
      await log_error(client, error as Error, `Bypass Select: ${interaction.customId}`, {
        user: interaction.user.tag,
        guild: interaction.guild?.name || "DM",
        channel: interaction.channel?.id,
      })
    }
  }

  // - 指令处理器 - \\
  // - command handlers - \\
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  const ctx = { interaction, client }
  await run_middleware([error_handler], ctx, async () => {
    await command.execute(interaction)
  })
})

// - 消息监听，自动给链接开路 - \\
// - message create event, auto-bypassing links - \\
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return
  await handle_auto_bypass(message)
})

// - 错误捕获，不让机器人崩掉 - \\
// - error handlers, keeping things alive - \\
client.on("error", (error) => {
  console.error("[ - BYPASS - ] Client error:", error)
  log_error(client, error, "Bypass Client Error", {}).catch(() => { })
})

process.on("unhandledRejection", (error: Error) => {
  console.error("[ - BYPASS - ] Unhandled rejection:", error)
  log_error(client, error, "Bypass Unhandled Rejection", {}).catch(() => { })
})

process.on("uncaughtException", (error: Error) => {
  console.error("[ - BYPASS - ] Uncaught exception:", error)
  log_error(client, error, "Bypass Uncaught Exception", {}).catch(() => { })
})

// - 登录咯 - \\
// - login time! - \\
client.login(bypass_token)
  .then(() => {
    console.warn("[ - BYPASS - ] Login successful")
  })
  .catch((error) => {
    console.error("[ - BYPASS - ] Login failed:", error)
    process.exit(1)
  })
