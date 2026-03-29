/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Collection, GatewayIntentBits, ActivityType, REST, Routes } from "discord.js"
import { config } from "dotenv"
import { Command } from "@shared/types/command"
import { log_error } from "@shared/utils/error_logger"
import { db } from "@shared/utils"
import { readdirSync } from "fs"
import { join } from "path"
import { start_idn_live_scheduler } from "@jkt48/modules/live_notify/schedulers/idn_live_monitor"
import { handle_check_on_live_button } from "@jkt48/modules/live_info/interactions/buttons/check_on_live"
import { handle_history_live_button } from "@jkt48/modules/live_info/interactions/buttons/history_live"
import { run_middleware } from "@shared/middleware/runner"
import { error_handler } from "@shared/middleware/error.handler"

config()

const is_production = process.env.NODE_ENV === "production"
if (is_production) {
  console.log = () => { }
}

const jkt48_token = process.env.JKT48_DISCORD_TOKEN!
const jkt48_client_id = process.env.JKT48_CLIENT_ID!

if (!jkt48_token || !jkt48_client_id) {
  console.error("[ - ERROR - ] JKT48_DISCORD_TOKEN or JKT48_CLIENT_ID not found in .env")
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
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

let typing_interval: NodeJS.Timeout | null = null

const __persistent_typing_channel_id = "1257034070035267636"
const __persistent_typing_interval_ms = 8000

/**
 * - 启动持续输入状态 - \\
 * - start persistent typing - \\
 * @returns {Promise<void>}
 */
async function start_persistent_typing(): Promise<void> {
  if (typing_interval) {
    clearInterval(typing_interval)
    typing_interval = null
  }

  const send_typing = async (): Promise<void> => {
    try {
      const channel = client.channels.cache.get(__persistent_typing_channel_id)
        || await client.channels.fetch(__persistent_typing_channel_id).catch(() => null)

      if (!channel || !("sendTyping" in channel)) {
        return
      }

      await (channel as any).sendTyping()
    } catch (error) {
      console.error("[ - JKT48 - ] Failed to send typing:", error)
      await log_error(client, error as Error, "persistent_typing_loop_jkt48", {
        channel_id: __persistent_typing_channel_id,
      })
    }
  }

  await send_typing()
  typing_interval = setInterval(() => {
    void send_typing()
  }, __persistent_typing_interval_ms)
}

/**
 * - 加载 JKT48 命令 - \\
 * - load jkt48 commands - \\
 * @returns {Promise<object[]>} array of command data for registration
 */
async function load_jkt48_commands(): Promise<object[]> {
  const commands_data: object[] = []
  const modules_path = join(__dirname, "../jkt48_bot/modules")

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
          console.warn(`[ - JKT48 - ] Skipping ${item.name} - no valid command export`)
          continue
        }

        const command_name = command.data.name
        client.commands.set(command_name, command)
        commands_data.push(command.data.toJSON())
        console.log(`[ - JKT48 - ] Loaded: /${command_name}`)
      }
    }
  }

  await load_from_directory(modules_path)

  console.log(`[ - JKT48 - ] Total commands: ${commands_data.length}`)
  return commands_data
}

/**
 * - 注册 JKT48 命令 - \\
 * - register jkt48 commands - \\
 * @param {object[]} commands_data - array of command data
 */
async function register_jkt48_commands(commands_data: object[]) {
  const rest = new REST().setToken(jkt48_token)

  try {
    console.log(`[ - JKT48 - ] Registering ${commands_data.length} commands...`)

    await rest.put(
      Routes.applicationCommands(jkt48_client_id),
      { body: commands_data }
    )

    console.log("[ - JKT48 - ] Commands registered successfully")
  } catch (error) {
    console.error("[ - JKT48 - ] Command registration failed:", error)
    throw error
  }
}

// - 机器人开机啦，准备给推发通知 - \\
// - client ready event, ready to ping those lives - \\
client.once("ready", async () => {
  console.log(`[ - JKT48 - ] Bot logged in as ${client.user?.tag}`)
  console.log(`[ - JKT48 - ] Serving ${client.guilds.cache.size} guilds`)

  await start_persistent_typing()

  // - 连上数据库，不然监控没法跑 - \\
  // - connect to database, essential for live monitoring - \\
  try {
    const mongo = await db.connect()
    if (!mongo) {
      console.error("[ - JKT48 - ] Database connection failed - live monitoring may not work properly")
    } else {
      console.log("[ - JKT48 - ] Database connected successfully")
    }
  } catch (error) {
    console.error("[ - JKT48 - ] Database connection error:", error)
  }

  try {
    const commands_data = await load_jkt48_commands()
    await register_jkt48_commands(commands_data)
    await start_idn_live_scheduler(client)
  } catch (error) {
    console.error("[ - JKT48 - ] Failed to load/register commands:", error)
  }
})

// - 交互事件分发 center - \\
// - interaction create event, central hub - \\
client.on("interactionCreate", async (interaction) => {
  // - 按钮点点点处理器 - \\
  // - button handlers - \\
  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith("history_live_prev:") || interaction.customId.startsWith("history_live_next:")) {
        await handle_history_live_button(interaction)
        return
      }
      if (interaction.customId.startsWith("check_on_live_prev:") || interaction.customId.startsWith("check_on_live_next:")) {
        await handle_check_on_live_button(interaction)
        return
      }
    } catch (error) {
      console.error("[ - JKT48 - ] Button error:", error)
      await log_error(client, error as Error, `JKT48 Button: ${interaction.customId}`, {
        user: interaction.user.tag,
        guild: interaction.guild?.name || "DM",
        channel: interaction.channel?.id,
      })
    }
  }

  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  const ctx = { interaction, client }
  await run_middleware([error_handler], ctx, async () => {
    await command.execute(interaction)
  })
})

// - 错误捕获，守护机器人不罢工 - \\
// - error handlers, keeping the bot up - \\
client.on("error", (error) => {
  console.error("[ - JKT48 - ] Client error:", error)
  log_error(client, error, "JKT48 Client Error", {}).catch(() => { })
})

process.on("unhandledRejection", (error: Error) => {
  console.error("[ - JKT48 - ] Unhandled rejection:", error)
  log_error(client, error, "JKT48 Unhandled Rejection", {}).catch(() => { })
})

process.on("uncaughtException", (error: Error) => {
  console.error("[ - JKT48 - ] Uncaught exception:", error)
  log_error(client, error, "JKT48 Uncaught Exception", {}).catch(() => { })
})

// - 登录开启通知模式 - \\
// - login and start notifying - \\
client.login(jkt48_token)
  .then(() => {
    console.log("[ - JKT48 - ] Login successful")
  })
  .catch((error) => {
    console.error("[ - JKT48 - ] Login failed:", error)
    process.exit(1)
  })
