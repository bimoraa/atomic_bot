import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command }              from "../../types/command"
import { is_admin }             from "../../functions/permissions"
import { component, api, format } from "../../utils"

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
                `This control panel is for the project: Service Provider`,
                `If you're a buyer, click on the buttons below to redeem your key, get the script or get your role`,
              ],
              thumbnail: format.logo_url,
            }),
            component.divider(),
            component.action_row(
              component.primary_button("Redeem Key", "script_redeem_key", { name: "🎟️" }),
              component.success_button("Get Script", "script_get_script", { name: "📜" }),
              component.secondary_button("Get Role", "script_get_role", { name: "🎭" }),
              component.secondary_button("Reset HWID", "script_reset_hwid", { name: "🔄" }),
              component.secondary_button("Get Stats", "script_get_stats", { name: "📊" }),
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
