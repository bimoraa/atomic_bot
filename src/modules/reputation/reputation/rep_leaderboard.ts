import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { Command }    from "../../../shared/types/command"
import { component }  from "../../../shared/utils"
import * as reputation from "../../../shared/database/managers/reputation_manager"

const rep_leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName("rep-leaderboard")
    .setDescription("View the reputation leaderboard")
    .addIntegerOption(option =>
      option
        .setName("limit")
        .setDescription("Number of users to display (default: 10)")
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const limit       = interaction.options.getInteger("limit") || 10
    const leaderboard = await reputation.get_leaderboard(interaction.guild!.id, limit)

    if (leaderboard.length === 0) {
      await interaction.reply({
        content  : "No reputation records found.",
        ephemeral: true,
      })
      return
    }

    const leaderboard_text = leaderboard.map((record, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
      return `${medal} <@${record.user_id}> - **${record.total_rep}** reputation`
    })

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Reputation Leaderboard`,
              ``,
              ...leaderboard_text,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply(message)
  },
}

export default rep_leaderboard
