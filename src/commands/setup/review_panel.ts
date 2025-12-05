import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "../../types/command"
import { is_admin } from "../../functions/permissions"
import { component, api } from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("review_panel")
    .setDescription("Send the review panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const channel = interaction.channel as TextChannel

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("# ⭐ Reviews\nShare your experience with us!"),
            component.divider(),
            component.action_row(component.primary_button("Submit a Review", "review_submit")),
          ],
        }),
      ],
    })

    await api.send_components_v2(channel.id, api.get_token(), message)

    await interaction.reply({
      content: "Review panel sent!",
      ephemeral: true,
    })
  },
}
