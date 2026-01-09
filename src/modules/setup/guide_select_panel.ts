import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command }                                                       from "../../shared/types/command"
import { is_admin }                                                      from "../../shared/database/permissions"
import { api, component }                                                from "../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("guide-panel")
    .setDescription("Send guide selection panel for staff") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "Only admins can send this panel.",
        flags:   64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const panel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## <:app:1381680319207575552> | Staff Guide Panel`,
              ``,
              `Pilih guide yang kamu butuhkan dari dropdown di bawah.`,
            ]),
            component.divider(2),
            component.select_menu("guide_select", "Pilih Guide", [
              {
                label:       "Purchase Ticket",
                value:       "ticket",
                description: "Panduan handle purchase ticket",
              },
              {
                label:       "Submit Payment",
                value:       "submit-payment",
                description: "Tutorial submit payment",
              },
            ]),
          ],
        }),
      ],
    })

    const result = await api.send_components_v2(interaction.channelId, api.get_token(), panel_message)

    if (result.error) {
      await interaction.editReply({ content: `Error: ${JSON.stringify(result)}` })
      return
    }

    await interaction.editReply({ content: "Guide panel sent!" })
  },
}

export default command
