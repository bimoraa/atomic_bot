import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
}                         from "discord.js"
import { Command }         from "@shared/types/command"
import { api, component }  from "@shared/utils"
import { log_error }       from "@shared/utils/error_logger"
import * as share_settings from "../../../core/handlers/shared/controller/share_settings_controller"

/**
 * - EXECUTE ADD ROD COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_add_rod(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const rod_name = interaction.options.getString("rod_name", true)
    const result   = await share_settings.add_rod_option(interaction.client, rod_name)

    if (!result) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Failed to add rod"),
            ],
          }),
        ],
      }))
      return
    }

    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Rod added"),
          ],
        }),
      ],
    }))
  } catch (error) {
    await log_error(interaction.client, error as Error, "add_rod_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to add rod"),
          ],
        }),
      ],
    }))
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("add-rod")
    .setDescription("Add rod option")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName("rod_name").setDescription("Rod name").setRequired(true)) as SlashCommandBuilder,

  execute : execute_add_rod,
}
