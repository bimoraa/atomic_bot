import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }         from "../../../shared/types/command"
import { api, component }  from "../../../shared/utils"
import { log_error }       from "../../../shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE DELETE SETTINGS COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_delete_settings(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const target_publisher = interaction.options.getUser("target_publisher", true)
    const settings_id      = interaction.options.getString("target_settings", true)

    const record = await share_settings.get_settings_record(interaction.client, settings_id)
    if (!record || record.publisher_id !== target_publisher.id) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Settings not found for target publisher"),
            ],
          }),
        ],
      }))
      return
    }

    const deleted = await share_settings.delete_settings_record(interaction.client, settings_id)
    if (!deleted) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Failed to delete settings"),
            ],
          }),
        ],
      }))
      return
    }

    if (deleted.channel_id && deleted.message_id) {
      await api.delete_message(deleted.channel_id, deleted.message_id, api.get_token())
    }

    if (deleted.forum_thread_id && deleted.forum_message_id) {
      await api.delete_message(deleted.forum_thread_id, deleted.forum_message_id, api.get_token())
    }

    if (deleted.thread_id) {
      const thread = await interaction.client.channels.fetch(deleted.thread_id).catch(() => null)
      if (thread && thread.isThread()) {
        await thread.setArchived(true).catch(() => {})
      }
    }

    if (deleted.forum_thread_id) {
      const forum_thread = await interaction.client.channels.fetch(deleted.forum_thread_id).catch(() => null)
      if (forum_thread && forum_thread.isThread()) {
        await forum_thread.setArchived(true).catch(() => {})
      }
    }

    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Settings deleted"),
          ],
        }),
      ],
    }))
  } catch (error) {
    await log_error(interaction.client, error as Error, "delete_settings_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to delete settings"),
          ],
        }),
      ],
    }))
  }
}

/**
 * - AUTOCOMPLETE DELETE SETTINGS - \\
 * @param {AutocompleteInteraction} interaction - Autocomplete interaction
 * @returns {Promise<void>}
 */
async function autocomplete_delete_settings(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused(true)
  if (focused.name !== "target_settings") {
    await interaction.respond([])
    return
  }

  const target_publisher_id = (interaction.options as any).get("target_publisher")?.value as string | undefined
  if (!target_publisher_id) {
    await interaction.respond([])
    return
  }

  const query = focused.value.toLowerCase()
  const records = await share_settings.list_settings_by_publisher(interaction.client, target_publisher_id)
  const matches = records
    .filter((record) => share_settings.build_settings_label(record).toLowerCase().includes(query))
    .slice(0, 25)
    .map((record) => ({ name: share_settings.build_settings_label(record), value: record.settings_id }))
  await interaction.respond(matches)
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("delete-settings")
    .setDescription("Delete shared settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) => option.setName("target_publisher").setDescription("Target publisher").setRequired(true))
    .addStringOption((option) => option.setName("target_settings").setDescription("Target settings").setAutocomplete(true).setRequired(true)) as SlashCommandBuilder,

  execute      : execute_delete_settings,
  autocomplete : autocomplete_delete_settings,
}
