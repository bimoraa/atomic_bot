import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command }          from "@shared/types/command"
import { is_admin }         from "@shared/database/settings/permissions"
import { component, api }   from "@shared/utils"
import { log_error }        from "@shared/utils/error_logger"
import { get_ticket_config } from "@shared/database/unified_ticket"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("purchase_panel")
    .setDescription("Send or edit the purchase ticket panel")
    .addStringOption((opt) =>
      opt
        .setName("message_id")
        .setDescription("Message ID to edit (leave empty to send new)")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags   : 64,
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
              "You can only create a ticket to purchase a script. Opening a ticket without making a purchase will be considered intentional trolling and a warning will be given.",
              "",
              "Our script price is stated in <#1250770696876068927>",
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              "## Payment Method:",
              "- <:qris:1251913366713139303> - QRIS ( Quick Response Code Indonesian Standard )",
              "- <:dana:1251913282923790379> - Dana",
              "- <:gopay:1251913342646489181> - Gopay",
              "-  <:paypal:1251913398816604381> - Paypal",
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.success_button("Purchase Script ( Open a Ticket )", "purchase_open")
            ),
          ],
        }),
      ],
    })

    const message_id = interaction.options.getString("message_id")

    try {
      if (message_id) {
        await api.edit_components_v2(channel.id, message_id, api.get_token(), message)
        await interaction.editReply({ content: `Purchase panel updated! (message: ${message_id})` })
      } else {
        await api.send_components_v2(channel.id, api.get_token(), message)
        await interaction.editReply({ content: "Purchase panel sent!" })
      }
    } catch (err) {
      await log_error(interaction.client, err as Error, "Purchase Panel Send/Edit", {
        guild_id  : interaction.guildId  ?? undefined,
        user_id   : interaction.user.id,
      }).catch(() => {})
      await interaction.editReply({ content: "Failed to send/edit purchase panel." })
    }
  },
}
