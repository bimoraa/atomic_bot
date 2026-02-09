import { Client, Collection, GatewayIntentBits, ActivityType, REST, Routes } from "discord.js"
import { config }                                                            from "dotenv"
import { Command }                                                           from "@shared/types/command"
import { log_error }                                                         from "@shared/utils/error_logger"
import { readdirSync }                                                       from "fs"
import { join }                                                              from "path"
import { start_idn_live_scheduler }                                          from "@jkt48/core/schedulers/idn_live_monitor"
import { handle_check_on_live_button }                                       from "@jkt48/core/buttons/check_on_live"
import { handle_history_live_button }                                        from "@jkt48/core/buttons/history_live"

config()

const is_production = process.env.NODE_ENV === "production"
if (is_production) {
  console.log = () => {}
}

const jkt48_token     = process.env.JKT48_DISCORD_TOKEN!
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
    status    : "online",
    activities: [{
      name : "JKT48 Live Streams",
      type : ActivityType.Watching,
      state: "Monitoring JKT48 Streams",
    }],
  },
}) as Client & { commands: Collection<string, Command> }

client.commands = new Collection()

/**
 * - LOAD JKT48 COMMANDS - \\
 * @returns {Promise<object[]>} Array of command data for registration
 */
async function load_jkt48_commands(): Promise<object[]> {
  const commands_data: object[] = []
  const jkt48_path = join(__dirname, "../jkt48_bot/modules")

  const files = readdirSync(jkt48_path).filter(file => file.endsWith(".ts") || file.endsWith(".js"))

  for (const file of files) {
    const file_path = join(jkt48_path, file)
    const imported  = await import(file_path)
    const command   = imported.default || imported.command

    if (!command?.data) {
      console.warn(`[ - JKT48 - ] Skipping ${file} - no valid command export`)
      continue
    }

    const command_name = command.data.name
    client.commands.set(command_name, command)
    commands_data.push(command.data.toJSON())
    console.log(`[ - JKT48 - ] Loaded: /${command_name}`)
  }

  console.log(`[ - JKT48 - ] Total commands: ${commands_data.length}`)
  return commands_data
}

/**
 * - REGISTER JKT48 COMMANDS - \\
 * @param {object[]} commands_data - Array of command data
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

// - CLIENT READY EVENT - \\
client.once("ready", async () => {
  console.log(`[ - JKT48 - ] Bot logged in as ${client.user?.tag}`)
  console.log(`[ - JKT48 - ] Serving ${client.guilds.cache.size} guilds`)

  try {
    const commands_data = await load_jkt48_commands()
    await register_jkt48_commands(commands_data)
    await start_idn_live_scheduler(client)
  } catch (error) {
    console.error("[ - JKT48 - ] Failed to load/register commands:", error)
  }
})

// - INTERACTION CREATE EVENT - \\
client.on("interactionCreate", async (interaction) => {
  // - BUTTON HANDLERS - \\
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
        user    : interaction.user.tag,
        guild   : interaction.guild?.name || "DM",
        channel : interaction.channel?.id,
      })
    }
  }

  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error("[ - JKT48 - ] Command error:", error)

    await log_error(client, error as Error, `JKT48 Command: ${interaction.commandName}`, {
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

// - ERROR HANDLERS - \\
client.on("error", (error) => {
  console.error("[ - JKT48 - ] Client error:", error)
  log_error(client, error, "JKT48 Client Error", {}).catch(() => {})
})

process.on("unhandledRejection", (error: Error) => {
  console.error("[ - JKT48 - ] Unhandled rejection:", error)
  log_error(client, error, "JKT48 Unhandled Rejection", {}).catch(() => {})
})

process.on("uncaughtException", (error: Error) => {
  console.error("[ - JKT48 - ] Uncaught exception:", error)
  log_error(client, error, "JKT48 Uncaught Exception", {}).catch(() => {})
})

// - LOGIN - \\
client.login(jkt48_token)
  .then(() => {
    console.log("[ - JKT48 - ] Login successful")
  })
  .catch((error) => {
    console.error("[ - JKT48 - ] Login failed:", error)
    process.exit(1)
  })
