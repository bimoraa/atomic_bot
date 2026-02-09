import { Client, Collection, GatewayIntentBits, ActivityType, REST, Routes, Message } from "discord.js"
import { config }                                                                    from "dotenv"
import { Command }                                                                   from "@shared/types/command"
import { log_error }                                                                 from "@shared/utils/error_logger"
import { db }                                                                        from "@shared/utils"
import { readdirSync }                                                               from "fs"
import { join }                                                                      from "path"
import { handle_auto_bypass }                                                        from "@bypass/core/events/auto_bypass"
import { handle_bypass_mobile_copy }                                                 from "@bypass/core/buttons/bypass_mobile_copy"
import { handle_bypass_support_type_select }                                         from "@bypass/core/select_menus/bypass_support_type_select"

config()

const bypass_token           = process.env.BYPASS_DISCORD_TOKEN!
const bypass_client_id       = process.env.BYPASS_CLIENT_ID!
const allow_message_content  = ["true", "1", "yes"].includes(
  String(process.env.BYPASS_ENABLE_MESSAGE_CONTENT || "").toLowerCase()
)

if (!bypass_token || !bypass_client_id) {
  console.log("[ - BYPASS - ] Token not configured, skipping bypass bot startup")
  process.exit(0)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    ...(allow_message_content ? [GatewayIntentBits.MessageContent] : []),
  ],
  presence: {
    status    : "dnd",
    activities: [{
      name : "Atomic-7",
      type : ActivityType.Custom,
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
  const commands_data: object[]  = []
  const modules_path             = join(__dirname, "../bypass_bot/modules")

  const items = readdirSync(modules_path, { withFileTypes: true })

  for (const item of items) {
    if (!item.isFile() || (!item.name.endsWith(".ts") && !item.name.endsWith(".js"))) continue

    const item_path = join(modules_path, item.name)
    const imported  = await import(item_path)
    const command   = imported.default || imported.command

    if (!command?.data) {
      console.warn(`[ - BYPASS - ] Skipping ${item.name} - no valid command export`)
      continue
    }

    const command_name = command.data.name
    console.log(`[ - BYPASS - ] Loaded: ${command_name}`)
    client.commands.set(command_name, command)
    commands_data.push(command.data.toJSON())
  }

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

  console.log(`[ - BYPASS - ] Registered ${commands_data.length} commands`)
}

// - CLIENT READY EVENT - \\
client.once("ready", async () => {
  console.log(`[ - BYPASS - ] Bot logged in as ${client.user?.tag}`)
  console.log(`[ - BYPASS - ] Serving ${client.guilds.cache.size} guilds`)

  try {
    const commands_data = await load_bypass_commands(client)
    await register_bypass_commands(commands_data)
  } catch (error) {
    console.error("[ - BYPASS - ] Failed to load/register commands:", error)
  }

  // - CONNECT TO DATABASE & CLEANUP BYPASS CACHE - \\
  try {
    await db.connect()
    setInterval(() => db.cleanup_expired_bypass_cache(), 10 * 60 * 1000)
  } catch (error) {
    console.error("[ - BYPASS - ] Database connection error:", error)
  }
})

// - INTERACTION CREATE EVENT - \\
client.on("interactionCreate", async (interaction) => {
  // - BUTTON HANDLERS - \\
  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith("bypass_mobile_copy:")) {
        await handle_bypass_mobile_copy(interaction)
        return
      }
    } catch (error) {
      console.error("[ - BYPASS - ] Button error:", error)
      await log_error(client, error as Error, `Bypass Button: ${interaction.customId}`, {
        user    : interaction.user.tag,
        guild   : interaction.guild?.name || "DM",
        channel : interaction.channel?.id,
      })
    }
  }

  // - SELECT MENU HANDLERS - \\
  if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.customId.startsWith("bypass_support_type_select:")) {
        await handle_bypass_support_type_select(interaction)
        return
      }
    } catch (error) {
      console.error("[ - BYPASS - ] Select menu error:", error)
      await log_error(client, error as Error, `Bypass Select: ${interaction.customId}`, {
        user    : interaction.user.tag,
        guild   : interaction.guild?.name || "DM",
        channel : interaction.channel?.id,
      })
    }
  }

  // - COMMAND HANDLERS - \\
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error("[ - BYPASS - ] Command error:", error)

    await log_error(client, error as Error, `Bypass Command: ${interaction.commandName}`, {
      user    : interaction.user.tag,
      guild   : interaction.guild?.name || "DM",
      channel : interaction.channel?.id,
    })

    const content = "There was an error executing this command."
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true })
    } else {
      await interaction.reply({ content, ephemeral: true })
    }
  }
})

// - MESSAGE CREATE EVENT (AUTO BYPASS) - \\
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return
  await handle_auto_bypass(message)
})

// - ERROR HANDLERS - \\
client.on("error", (error) => {
  console.error("[ - BYPASS - ] Client error:", error)
  log_error(client, error, "Bypass Client Error", {}).catch(() => {})
})

process.on("unhandledRejection", (error: Error) => {
  console.error("[ - BYPASS - ] Unhandled rejection:", error)
  log_error(client, error, "Bypass Unhandled Rejection", {}).catch(() => {})
})

process.on("uncaughtException", (error: Error) => {
  console.error("[ - BYPASS - ] Uncaught exception:", error)
  log_error(client, error, "Bypass Uncaught Exception", {}).catch(() => {})
})

// - LOGIN - \\
client.login(bypass_token)
  .then(() => {
    console.log("[ - BYPASS - ] Login successful")
  })
  .catch((error) => {
    console.error("[ - BYPASS - ] Login failed:", error)
    process.exit(1)
  })
