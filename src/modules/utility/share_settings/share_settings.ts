import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }         from "../../../shared/types/command"
import { log_error }       from "../../../shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE SHARE SETTINGS COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_share_settings(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
    return
  }

  try {
    const pending_token = share_settings.create_pending_entry({
      action     : "create",
      user_id    : interaction.user.id,
      created_at : Date.now(),
      payload    : {
        publisher_id       : interaction.user.id,
        publisher_name     : interaction.user.tag,
        publisher_avatar   : interaction.user.displayAvatarURL(),
        mode               : interaction.options.getString("mode", true),
        version            : interaction.options.getString("version", true),
        location           : interaction.options.getString("location", true),
        total_notification : interaction.options.getString("total_notification", true),
        cancel_delay       : interaction.options.getString("cancel_delay", true),
        complete_delay     : interaction.options.getString("complete_delay", true),
      },
    })

    const rod_options = await share_settings.list_rod_options(interaction.client)
    const skin_options = await share_settings.list_skin_options(interaction.client)
    const message_payload = share_settings.build_share_settings_picker_message({
      token        : pending_token,
      rod_options  : rod_options,
      skin_options : skin_options,
    })

    await interaction.reply({
      ...message_payload,
      ephemeral: true,
    })
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_command", {})
    await interaction.reply({ content: "Failed to open settings picker", ephemeral: true }).catch(() => {})
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("share-settings")
    .setDescription("Share rod settings to community")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Mode")
        .addChoices(
          { name: "Super Instant", value: "Super Instant" },
          { name: "Super Instant BETA", value: "Super Instant BETA" }
        )
        .setRequired(true)
    )
    .addStringOption((option) => option.setName("version").setDescription("Version").setRequired(true))
    .addStringOption((option) => option.setName("location").setDescription("Location").setRequired(true))
    .addStringOption((option) => option.setName("total_notification").setDescription("Total notification").setRequired(true))
    .addStringOption((option) => option.setName("cancel_delay").setDescription("Cancel delay").setRequired(true))
    .addStringOption((option) => option.setName("complete_delay").setDescription("Complete delay").setRequired(true)) as SlashCommandBuilder,

  execute      : execute_share_settings,
}
