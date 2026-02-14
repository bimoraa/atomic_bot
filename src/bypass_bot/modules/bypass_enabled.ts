import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "@shared/types/command"
import { component, guild_settings } from "@shared/utils"

/**
 * - BYPASS ENABLED COMMAND - \\
 */
const bypass_enabled_command: Command = {
  data: new SlashCommandBuilder()
    .setName("bypass-enabled")
    .setDescription("Enable or disable bypass feature in this server")
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Set true to enable, false to disable")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Required when disabling bypass")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction) => {
    const allowed_user_id = "1118453649727823974"

    if (interaction.user.id !== allowed_user_id) {
      const unauthorized_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Access Denied",
                "",
                "Only authorized user can change bypass enabled status.",
              ]),
            ],
          }),
        ],
      })

      unauthorized_message.flags = (unauthorized_message.flags ?? 0) | 64

      await interaction.reply(unauthorized_message)
      return
    }

    const guild_id = interaction.guildId
    if (!guild_id) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Invalid Context",
                "",
                "This command can only be used in a server.",
              ]),
            ],
          }),
        ],
      })

      error_message.flags = (error_message.flags ?? 0) | 64

      await interaction.reply(error_message)
      return
    }

    const enabled = interaction.options.getBoolean("enabled", true)
    const reason  = (interaction.options.getString("reason") || "").trim()

    if (!enabled && !reason) {
      const validation_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Reason Required",
                "",
                "Reason is required when `enabled` is set to `false`.",
              ]),
            ],
          }),
        ],
      })

      validation_message.flags = (validation_message.flags ?? 0) | 64

      await interaction.reply(validation_message)
      return
    }

    if (enabled) {
      const saved = await guild_settings.set_guild_setting(guild_id, "bypass_enabled", "true")
      await guild_settings.remove_guild_setting(guild_id, "bypass_disabled_reason")

      const response_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                saved ? "## Bypass Enabled" : "## Failed to Save",
                "",
                saved
                  ? "Bypass feature is now enabled."
                  : "Could not update bypass status. Please try again.",
              ]),
            ],
          }),
        ],
      })

      response_message.flags = (response_message.flags ?? 0) | 64

      await interaction.reply(response_message)
      return
    }

    const enabled_saved = await guild_settings.set_guild_setting(guild_id, "bypass_enabled", "false")
    const reason_saved  = await guild_settings.set_guild_setting(guild_id, "bypass_disabled_reason", reason)

    const saved = enabled_saved && reason_saved

    const response_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              saved ? "## Bypass Disabled" : "## Failed to Save",
              "",
              saved
                ? `Under Maintenance, Reason: ${reason}`
                : "Could not update bypass status. Please try again.",
            ]),
          ],
        }),
      ],
    })

    response_message.flags = (response_message.flags ?? 0) | 64

    await interaction.reply(response_message)
  },
}

export default bypass_enabled_command
