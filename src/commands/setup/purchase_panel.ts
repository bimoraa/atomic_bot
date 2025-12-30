import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "../../types/command"
import { is_admin } from "../../services/permissions"
import { component, api } from "../../utils"
import { get_ticket_config } from "../../services/unified_ticket"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("purchase_panel")
    .setDescription("Send the purchase ticket panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: 64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const config = get_ticket_config("purchase")
    if (!config) {
      await interaction.editReply({ content: "Purchase ticket config not found." })
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
            component.text([
              "## Purchase Ticket",
              "If you have questions about the script please use <#1250786601462923396> to ask our staffs.",
              "",
              "You can only create a ticket to purchase a script. Opening a ticket without making a purchase will be considered intentional trolling and a warning will be given.",
              "",
              "Our script price is stated in <#1250770696876068927>",
            ]),
            component.divider(),
            component.section({
              content: [
                "## Payment Method:",
                "<:qris:1251913366713139303> - QRIS ( Quick Response Code Indonesian Standard )",
                "<:paypal:1251913398816604381> - Paypal",
                "<:gopay:1251913342646489181> - Gopay",
                "<:dana:1251913282923790379> - Dana",
                "<:ovo:1251913316092088404> - Ovo",
              ],
              thumbnail: "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
            }),
            component.divider(),
            component.action_row(
              component.secondary_button("Open", "purchase_open", component.emoji_object("ticket", "1411878131366891580"))
            ),
          ],
        }),
      ],
    })

    await api.send_components_v2(channel.id, api.get_token(), message)

    await interaction.editReply({
      content: "Purchase panel sent!",
    })
  },
}
