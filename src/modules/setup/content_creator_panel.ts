import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"
import { Command } from "../../shared/types/command"
import { component, api } from "../../shared/utils"
import { get_ticket_config } from "../../shared/database/unified_ticket/state"

/**
 * Send content creator application panel with button to open modal
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("content-creator-panel")
    .setDescription("Send the Apply Content Creator panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const config = get_ticket_config("content_creator")

    if (!config) {
      await interaction.reply({
        content:   "Content Creator ticket type not configured.",
        ephemeral: true,
      })
      return
    }

    const panel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("## <:checkmark:1417196825110253780> - Media Creator Ticket\n\n"),
          ],
        }),
        component.container({
          components: [
            component.text("## <:rbx:1447976733050667061> - What you'll get from us:\n- Free service provider scripts\n- Content Creator role\n- BETA access\n- Exclusive media channel for your content"),
            component.divider(2),
            component.text("## <:rbx:1447976733050667061> - Requirements to apply:\n- A Roblox-related YouTube or TikTok channel\n- Previously uploaded content\n- Reliability & consistency\n- TikTok live streams are highly preferred, but pre-recorded content is also accepted"),
            component.divider(2),
            component.section({
              content: "Interested?",
              accessory: component.secondary_button("Apply Content Creator", `${config.prefix}_open`),
            }),
          ],
        }),
      ],
    })

    const token = api.get_token()
    await api.send_components_v2(interaction.channelId, token, panel_message)

    await interaction.reply({
      content:   "Content creator panel sent successfully!",
      ephemeral: true,
    })
  },
}

export default command
