import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
} from "discord.js"
import { Command } from "../../../types/command"
import { component, api } from "../../../utils"
import { log_error } from "../../../utils/error_logger"
import { set_under_ratelimit } from "../../../interactions/controllers/service_provider_controller"

const ALLOWED_ROLE_ID = "1316021423206039596"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("under_ratelimit")
    .setDescription("Toggle rate limit mode for Service Provider HWID reset")
    .addBooleanOption((option) =>
      option
        .setName("value")
        .setDescription("Enable or disable rate limit mode")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
      await interaction.reply({
        content   : "You don't have permission to use this command.",
        ephemeral : true,
      })
      return
    }

    const value = interaction.options.getBoolean("value", true)

    await interaction.deferReply({ ephemeral: true })

    try {
      const updated = await set_under_ratelimit({
        client          : interaction.client,
        under_ratelimit : value,
        updated_by      : member.id,
      })

      if (!updated) {
        const failed_message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: [
                    "## Update Failed",
                    "Could not update rate limit setting.",
                  ],
                }),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, failed_message)
        return
      }

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  "## Under Rate Limit Updated",
                  `Status: ${value ? "Enabled" : "Disabled"}`,
                  value
                    ? "Cooldown: 30 seconds per user for HWID reset"
                    : "Cooldown disabled",
                ],
              }),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, success_message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "under_ratelimit_command", {
        value,
        user_id: member.id,
      })

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  "## Error",
                  "Failed to update rate limit mode.",
                ],
              }),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, error_message)
    }
  },
}
