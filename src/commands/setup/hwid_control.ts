import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"
import { file }        from "../../utils"
import { join }        from "path"

interface hwid_config {
  enabled: boolean
}

const CONFIG_PATH = join(__dirname, "../../configuration/hwid.cfg")

/**
 * Load HWID configuration.
 * @returns HWID config object.
 */
function load_config(): hwid_config {
  try {
    return file.read_json<hwid_config>(CONFIG_PATH)
  } catch {
    return { enabled: true }
  }
}

/**
 * Save HWID configuration.
 * @param config Config to save.
 */
function save_config(config: hwid_config): void {
  file.write_json(CONFIG_PATH, config)
}

/**
 * Get current HWID status.
 * @returns True if enabled, false otherwise.
 */
export function is_hwid_enabled(): boolean {
  const config = load_config()
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
      save_config({ enabled: true })

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
      save_config({ enabled: false })

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
      const config = load_config()
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
