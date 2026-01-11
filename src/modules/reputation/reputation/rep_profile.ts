import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { Command }    from "../../../shared/types/command"
import { component }  from "../../../shared/utils"
import * as reputation from "../../../shared/database/managers/reputation_manager"

const rep_profile: Command = {
  data: new SlashCommandBuilder()
    .setName("rep-profile")
    .setDescription("View reputation profile")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to view (defaults to yourself)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target   = interaction.options.getUser("user") || interaction.user
    const user_rep = await reputation.get_reputation(target.id, interaction.guild!.id)
    const logs     = await reputation.get_reputation_logs(target.id, interaction.guild!.id, 5)

    const total_rep = user_rep?.total_rep || 0
    const given_rep = user_rep?.given_rep || 0

    const recent_text = logs.length > 0
      ? logs.map(log => `- From <@${log.from_user_id}>: ${log.note}`).join("\n")
      : "No reputation received yet"

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Reputation Profile`,
                `**User:** <@${target.id}>`,
                `**Total Reputation:** ${total_rep}`,
                `**Reputation Given:** ${given_rep}`,
              ],
              thumbnail: target.displayAvatarURL({ extension: "png", size: 256 }),
            }),
            component.divider(2),
            component.text([
              `**Recent Reputation:**`,
              recent_text,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({ ...message, ephemeral: true })
  },
}

export default rep_profile
