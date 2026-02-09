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
 * - EXECUTE ADD SKIN COMMAND - \\
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function execute_add_skin(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const skin_name = interaction.options.getString("skin_name", true)
    const result    = await share_settings.add_skin_option(interaction.client, skin_name)

    if (!result) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Failed to add skin"),
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
            component.text("Skin added"),
          ],
        }),
      ],
    }))
  } catch (error) {
    await log_error(interaction.client, error as Error, "add_skin_command", {})
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to add skin"),
          ],
        }),
      ],
    }))
  }
}

export const command: Command = {
  data : new SlashCommandBuilder()
    .setName("add-skin")
    .setDescription("Add rod skin option")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName("skin_name").setDescription("Skin name").setRequired(true)) as SlashCommandBuilder,

  execute : execute_add_skin,
}
