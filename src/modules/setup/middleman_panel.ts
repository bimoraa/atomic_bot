import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command }             from "../../shared/types/command"
import { component, api }      from "../../shared/utils"

/**
 * @description Setup command for creating middleman/rekber service panel
 */
const middleman_panel: Command = {
  data: new SlashCommandBuilder()
    .setName("middleman-panel")
    .setDescription("Setup panel for middleman/rekber service")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel to send the panel to")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const channel = interaction.options.getChannel("channel", true)
    const token   = api.get_token()

    const panel_message = component.build_message({
      components: [
        component.container({
          components: [
            {
              type      : 9,
              components: [component.text("## Ticket — Rekber Service by Ophelia Store")],
              accessory : component.link_button("Join Ophelia", "https://discord.gg/opheliastore"),
            },
            component.divider(2),
            component.text("Untuk membuat ticket Rekber, silakan pilih rentang nominal transaksi melalui dropdown di bawah ini."),
            component.divider(2),
            component.select_menu("middleman_transaction_range_select", "Pilih rentang transaksi", [
              { label: "Rp 10.000 – Rp 50.000",   value: "dVzaCndYpO", description: "Fee: Rp 1.500" },
              { label: "Rp 50.000 – Rp 100.000",  value: "laf8By4Gtm", description: "Fee: Rp 5.000" },
              { label: "Rp 100.000 – Rp 200.000", value: "1FS1PRT0Ys", description: "Fee: Rp 8.000" },
              { label: "Rp 200.000 – Rp 300.000", value: "WnGoXX4HnQ", description: "Fee: Rp 12.000" },
              { label: "≥ Rp 300.000",            value: "PIMLKDohan", description: "Fee: 5% dari total transaksi" },
            ]),
          ],
        }),
      ],
    })

    const result = await api.send_components_v2(channel.id, token, panel_message)

    if (result.error) {
      await interaction.editReply({ content: `Failed to send panel: ${result.error}` })
      return
    }

    await interaction.editReply({ content: `Middleman panel sent to <#${channel.id}>` })
  },
}

export default middleman_panel
