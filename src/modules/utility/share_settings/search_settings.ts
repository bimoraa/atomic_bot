import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }        from "../../../shared/types/command"
import { api, component } from "../../../shared/utils"
import { log_error }      from "../../../shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE SEARCH SETTINGS COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_search_settings(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  try {
    const rod_name  = interaction.options.getString("rod_name", true)
    const rod_skin  = interaction.options.getString("rod_skin", false)
    const filter_by = interaction.options.getString("filter_by", false) || "highest_star"

    const records = await share_settings.search_settings_records(interaction.client, {
      rod_name  : rod_name,
      rod_skin  : rod_skin ? rod_skin : "no_skin",
      filter_by : filter_by,
    })

    if (records.length === 0) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("No settings found"),
            ],
          }),
        ],
      }))
      return
    }

    const token = share_settings.create_search_token(records, {
      rod_name  : rod_name,
      rod_skin  : rod_skin ? rod_skin : "no_skin",
      filter_by : filter_by,
    })

    const payload = share_settings.build_search_message({
      token   : token,
      records : records,
      index   : 0,
    })

    await api.edit_deferred_reply(interaction, payload)
  } catch (error) {
    await log_error(interaction.client, error as Error, "search_settings_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to search settings"),
          ],
        }),
      ],
    }))
  }
}

/**
 * - AUTOCOMPLETE SEARCH SETTINGS - \\
 * @param {AutocompleteInteraction} interaction - Autocomplete interaction
 * @returns {Promise<void>}
 */
async function autocomplete_search_settings(interaction: AutocompleteInteraction): Promise<void> {
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
    .setName("search-settings")
    .setDescription("Search shared rod settings")
    .addStringOption((option) => option.setName("rod_name").setDescription("Rod name").setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName("rod_skin").setDescription("Rod skin").setAutocomplete(true).setRequired(false))
    .addStringOption((option) =>
      option
        .setName("filter_by")
        .setDescription("Filter results")
        .addChoices(
          { name: "Highest Star", value: "highest_star" },
          { name: "Best", value: "best" },
          { name: "Most Used", value: "most_used" }
        )
        .setRequired(false)
    ) as SlashCommandBuilder,

  execute      : execute_search_settings,
  autocomplete : autocomplete_search_settings,
}
