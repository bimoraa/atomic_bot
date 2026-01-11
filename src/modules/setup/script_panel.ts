import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command }              from "../../shared/types/command"
import { is_admin }             from "../../shared/database/settings/permissions"
import { component, api, format } from "../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("script_panel")
    .setDescription("Send the script management panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content   : "You don't have permission to use this command.",
        ephemeral : true,
      })
      return
    }

    const channel = interaction.channel as TextChannel

    if (!channel) {
      await interaction.reply({
        content   : "Channel not found.",
        ephemeral : true,
      })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Script Control Panel`,
                `Manage your script access for Service Provider project.`,
              ],
              thumbnail: "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true",
            }),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.primary_button("Redeem Key", "script_redeem_key"),
              component.success_button("Get Script", "script_get_script"),
              component.secondary_button("Get Role", "script_get_role"),
              component.secondary_button("Reset HWID", "script_reset_hwid"),
              component.secondary_button("Get Stats", "script_get_stats"),
            ),
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(channel.id, api.get_token(), message)

    if (!response.error) {
      await interaction.reply({
        content   : "Script panel sent!",
        ephemeral : true,
      })
    } else {
      console.error("[script_panel] Error:", response)
      await interaction.reply({
        content   : "Failed to send script panel.",
        ephemeral : true,
      })
    }
  },
}
