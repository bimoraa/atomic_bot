import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "@shared/types/command"
import { is_admin } from "@shared/database/settings/permissions"
import { component, api, format } from "@shared/utils"
import { get_ticket_config } from "@shared/database/unified_ticket"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("helper_panel")
    .setDescription("Send the helper ticket panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: 64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const config = get_ticket_config("helper")
    if (!config) {
      await interaction.editReply({ content: "Helper ticket config not found." })
      return
    }

    let channel: TextChannel | null = null
    try {
      channel = await interaction.client.channels.fetch(config.panel_channel_id) as TextChannel
    } catch {
      channel = null
    }

    if (!channel) {
      await interaction.editReply({
        content: `Panel channel not found. ID: ${config.panel_channel_id}`,
      })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                "## <:rbx:1447976733050667061> Helper and Supporter Ticket",
                "",
                "All members, including non-buyers, who need assistance with scripts, features, usage guidance, or general questions about Atomic products.",
                "",
                "Your ticket will be handled by our Helper or Staff team, depending on availability.",
              ],
              thumbnail: format.logo_url,
            }),
            component.divider(),
            component.text([
              "### What you CANNOT ask here:",
              "- Refund requests",
              "- Sharing permission requests",
              "- Daily executor key issues",
              "- Executor download links",
              "- Payment or purchase complaints",
              "- Member reports or moderation issues",
            ]),
            component.divider(),
            component.text([
              "### Important:",
              "Tickets created for topics listed above will be closed as they are outside the Helper team's authority. For payment or purchase issues, please open a Customer Support Ticket instead.",
              "",
              "When creating your ticket, please describe your issue clearly so our team can assist you quickly.",
            ]),
            component.divider(),
            component.action_row(
              component.primary_button("Open Ticket", "helper_open")
            ),
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(channel.id, api.get_token(), message)

    if (!response.error) {
      await interaction.editReply({ content: "Helper panel sent successfully!" })
    } else {
      console.error("[helper_panel] Error:", response)
      await interaction.editReply({ content: "Failed to send helper panel." })
    }
  },
}
