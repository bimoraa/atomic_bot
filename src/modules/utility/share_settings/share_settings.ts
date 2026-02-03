import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }         from "../../../shared/types/command"
import { modal }           from "../../../shared/utils"
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
        rod_name           : interaction.options.getString("rod_name", true),
        rod_skin           : interaction.options.getString("rod_skin", false),
        cancel_delay       : interaction.options.getString("cancel_delay", true),
        complete_delay     : interaction.options.getString("complete_delay", true),
      },
    })

    const note_input = modal.create_text_input({
      custom_id  : "note",
      label      : "Note from Publisher",
      style      : "paragraph",
      required   : true,
      min_length : 1,
      max_length : 400,
    })

    const note_modal = modal.create_modal(`share_settings_modal:${pending_token}`, "Share Settings", note_input)
    await interaction.showModal(note_modal)
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_command", {})
    await interaction.reply({ content: "Failed to open settings modal", ephemeral: true }).catch(() => {})
  }
}

/**
 * - AUTOCOMPLETE SHARE SETTINGS - \\
 * @param {AutocompleteInteraction} interaction - Autocomplete interaction
 * @returns {Promise<void>}
 */
async function autocomplete_share_settings(interaction: AutocompleteInteraction): Promise<void> {
  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.respond([])
    return
  }

  const focused = interaction.options.getFocused(true)
  const query = focused.value.toLowerCase()

  if (focused.name === "rod_name") {
    const options = await share_settings.list_rod_options(interaction.client)
    const matches = options
      .filter((value) => value.toLowerCase().includes(query))
      .slice(0, 25)
      .map((value) => ({ name: value, value: value }))
    await interaction.respond(matches)
    return
  }

  if (focused.name === "rod_skin") {
    const options = await share_settings.list_skin_options(interaction.client)
    const matches = options
      .filter((value) => value.toLowerCase().includes(query))
      .slice(0, 25)
      .map((value) => ({ name: value, value: value }))
    await interaction.respond(matches)
    return
  }

  await interaction.respond([])
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
    .addStringOption((option) => option.setName("rod_name").setDescription("Rod name").setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName("rod_skin").setDescription("Rod skin").setAutocomplete(true).setRequired(false))
    .addStringOption((option) => option.setName("cancel_delay").setDescription("Cancel delay").setRequired(true))
    .addStringOption((option) => option.setName("complete_delay").setDescription("Complete delay").setRequired(true)) as SlashCommandBuilder,

  execute      : execute_share_settings,
  autocomplete : autocomplete_share_settings,
}
