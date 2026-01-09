import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"
import { db }          from "../../utils"

interface hwid_config {
  _id?   : string
  enabled: boolean
}

const COLLECTION_NAME = "hwid_control"

/**
 * Load HWID configuration from database.
 * @returns HWID config object.
 */
async function load_config(): Promise<hwid_config> {
  try {
    const config = await db.find_one<hwid_config>(COLLECTION_NAME, {})
    return config || { enabled: true }
  } catch {
    return { enabled: true }
  }
}

/**
 * Save HWID configuration to database.
 * @param config Config to save.
 */
async function save_config(config: hwid_config): Promise<void> {
  await db.update_one(COLLECTION_NAME, {}, config, true)
}

/**
 * Get current HWID status from database.
 * @returns True if enabled, false otherwise.
 */
export async function is_hwid_enabled(): Promise<boolean> {
  const config = await load_config()
  return config.enabled
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("hwid-control")
    .setDescription("Control HWID reset functionality")
    .addSubcommand(sub =>
      sub
        .setName("enable")
        .setDescription("Enable HWID reset functionality")
    )
    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable HWID reset functionality")
    )
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("Check HWID reset status")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "enable") {
      await save_config({ enabled: true })

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("#57F287"),
              components  : [
                component.text([
                  "## HWID Reset Enabled",
                  "HWID reset functionality has been enabled.",
                  "",
                  "Users can now reset their HWID using the Reset HWID button.",
                ]),
              ],
            }),
          ],
        }),
        flags: MessageFlags.Ephemeral,
      })
    } else if (subcommand === "disable") {
      await save_config({ enabled: false })

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("#ED4245"),
              components  : [
                component.text([
                  "## HWID Reset Disabled",
                  "HWID reset functionality has been disabled.",
                  "",
                  "Users will not be able to reset their HWID until re-enabled.",
                ]),
              ],
            }),
          ],
        }),
        flags: MessageFlags.Ephemeral,
      })
    } else if (subcommand === "status") {
      const config = await load_config()
      const status = config.enabled ? "Enabled" : "Disabled"
      const color  = config.enabled ? "#57F287" : "#ED4245"

      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex(color),
              components  : [
                component.text([
                  "## HWID Reset Status",
                  `Current Status: **${status}**`,
                  "",
                  config.enabled
                    ? "Users can reset their HWID normally."
                    : "HWID reset is currently disabled.",
                ]),
              ],
            }),
          ],
        }),
        flags: MessageFlags.Ephemeral,
      })
    }
  },
}

export default command
