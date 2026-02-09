import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }         from "@shared/types/command"
import { component, modal } from "@shared/utils"
import { log_error }       from "@shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE EDIT SETTINGS COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_edit_settings(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
    return
  }

  try {
    const settings_id = interaction.options.getString("target", true)
    const record = await share_settings.get_settings_record(interaction.client, settings_id)

    if (!record) {
      await interaction.reply(component.build_message({
        components : [
          component.container({
            components : [
              component.text("Settings not found"),
            ],
          }),
        ],
      }) as any)
      return
    }

    if (record.publisher_id !== interaction.user.id) {
      await interaction.reply(component.build_message({
        components : [
          component.container({
            components : [
              component.text("You are not allowed to edit this settings"),
            ],
          }),
        ],
      }) as any)
      return
    }

    const pending_token = share_settings.create_pending_entry({
      action      : "edit",
      user_id     : interaction.user.id,
      settings_id : settings_id,
      created_at  : Date.now(),
      payload     : {
        mode               : interaction.options.getString("mode", false) || record.mode,
        version            : interaction.options.getString("version", false) || record.version,
        location           : interaction.options.getString("location", false) || record.location,
        total_notification : interaction.options.getString("total_notification", false) || record.total_notification,
        rod_name           : interaction.options.getString("rod_name", false) || record.rod_name,
        rod_skin           : interaction.options.getString("rod_skin", false) || record.rod_skin,
        cancel_delay       : interaction.options.getString("cancel_delay", false) || record.cancel_delay,
        complete_delay     : interaction.options.getString("complete_delay", false) || record.complete_delay,
        note               : record.note,
      },
    })

    const note_input = modal.create_text_input({
      custom_id  : "note",
      label      : "Note from Publisher",
      style      : "paragraph",
      required   : true,
      min_length : 1,
      max_length : 400,
      value      : record.note || "",
    })

    const note_modal = modal.create_modal(`share_settings_edit:${pending_token}`, "Edit Settings", note_input)
    await interaction.showModal(note_modal)
  } catch (error) {
    await log_error(interaction.client, error as Error, "edit_settings_command", {})
    await interaction.reply({ content: "Failed to open edit modal", ephemeral: true }).catch(() => {})
  }
}

/**
 * - AUTOCOMPLETE EDIT SETTINGS - \\
 * @param {AutocompleteInteraction} interaction - Autocomplete interaction
 * @returns {Promise<void>}
 */
async function autocomplete_edit_settings(interaction: AutocompleteInteraction): Promise<void> {
  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.respond([])
    return
  }

  const focused = interaction.options.getFocused(true)
  const query = focused.value.toLowerCase()

  if (focused.name === "target") {
    const records = await share_settings.list_settings_by_publisher(interaction.client, interaction.user.id)
    const matches = records
      .filter((record) => share_settings.build_settings_label(record).toLowerCase().includes(query))
      .slice(0, 25)
      .map((record) => ({ name: share_settings.build_settings_label(record), value: record.settings_id }))
    await interaction.respond(matches)
    return
  }

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
    .setName("edit-settings")
    .setDescription("Edit shared rod settings")
    .addStringOption((option) => option.setName("target").setDescription("Target settings").setAutocomplete(true).setRequired(true))
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Mode")
        .addChoices(
          { name: "Super Instant", value: "Super Instant" },
          { name: "Super Instant BETA", value: "Super Instant BETA" }
        )
        .setRequired(false)
    )
    .addStringOption((option) => option.setName("version").setDescription("Version").setRequired(false))
    .addStringOption((option) => option.setName("location").setDescription("Location").setRequired(false))
    .addStringOption((option) => option.setName("total_notification").setDescription("Total notification").setRequired(false))
    .addStringOption((option) => option.setName("rod_name").setDescription("Rod name").setAutocomplete(true).setRequired(false))
    .addStringOption((option) => option.setName("rod_skin").setDescription("Rod skin").setAutocomplete(true).setRequired(false))
    .addStringOption((option) => option.setName("cancel_delay").setDescription("Cancel delay").setRequired(false))
    .addStringOption((option) => option.setName("complete_delay").setDescription("Complete delay").setRequired(false)) as SlashCommandBuilder,

  execute      : execute_edit_settings,
  autocomplete : autocomplete_edit_settings,
}
