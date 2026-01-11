import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "../../shared/types/command"
import { is_admin } from "../../shared/database/settings/permissions"
import { get_ticket_config } from "../../shared/database/unified_ticket"
import { component, api, format } from "../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("priority_panel")
    .setDescription("Send the priority support ticket panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const config = get_ticket_config("priority")
    if (!config) {
      await interaction.reply({ content: "Priority ticket config not found.", ephemeral: true })
      return
    }

    const channel = interaction.guild?.channels.cache.get(config.panel_channel_id) as TextChannel

    if (!channel) {
      await interaction.reply({ content: "Panel channel not found.", ephemeral: true })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Priority Support`,
                `This ticket can only be made by people with the role <@&${config.required_role_id}> as they are given the priority support by our Customer Relations Team. However, there are lists of things you need to know before opening a ticket.`,
                ``,
                `You can't open the ticket for the following reasons:`,
                ``,
                `1. Asking for refund`,
                `2. Asking for sharing permission`,
                `3. Asking help for daily executor key`,
                `4. Asking for executors download link`,
              ],
              thumbnail: format.logo_url,
            }),
            component.select_menu("priority_select", "Select Issue Type", [
              {
                label:       "Script Issue",
                value:       "script_issue",
                description: "Asking or Help about Script",
              },
              {
                label:       "Discord Issue",
                value:       "discord_issue",
                description: "Discord Account Transfer or Suspected Hacked Account",
              },
              {
                label:       "Others",
                value:       "others",
                description: "Reserved for urgent requests only",
              },
            ]),
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(channel.id, api.get_token(), message)

    if (!response.error) {
      await interaction.reply({ content: "Priority panel sent!", ephemeral: true })
    } else {
      console.error("[priority_panel] Error:", response)
      await interaction.reply({ content: "Failed to send priority panel.", ephemeral: true })
    }
  },
}
