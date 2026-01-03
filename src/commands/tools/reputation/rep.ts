import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { Command }    from "../../../types/command"
import { component }  from "../../../utils"
import * as reputation from "../../../services/reputation_manager"

const give_rep: Command = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Give reputation to a user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to give reputation to")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("note")
        .setDescription("A note about why you're giving reputation")
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true)
    const note   = interaction.options.getString("note") || "No note provided"

    if (target.id === interaction.user.id) {
      await interaction.reply({
        content  : "You cannot give reputation to yourself.",
        ephemeral: true,
      })
      return
    }

    if (target.bot) {
      await interaction.reply({
        content  : "You cannot give reputation to bots.",
        ephemeral: true,
      })
      return
    }

    const can_give = await reputation.can_give_rep(interaction.user.id, interaction.guild!.id)
    
    if (!can_give) {
      const remaining = await reputation.get_cooldown_remaining(interaction.user.id, interaction.guild!.id)
      await interaction.reply({
        content  : `You can give reputation again in ${remaining} hours.`,
        ephemeral: true,
      })
      return
    }

    const success = await reputation.give_reputation(
      interaction.user.id,
      target.id,
      interaction.guild!.id,
      note
    )

    if (success) {
      const user_rep = await reputation.get_reputation(target.id, interaction.guild!.id)
      
      const confirmation = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `You gave +1 reputation to <@${target.id}>`,
                `**Note:** ${note}`,
                ``,
                `<@${target.id}> now has **${user_rep?.total_rep || 1}** reputation.`,
              ]),
            ],
          }),
        ],
      })
      
      await interaction.reply(confirmation)
    } else {
      await interaction.reply({
        content  : "Failed to give reputation.",
        ephemeral: true,
      })
    }
  },
}

export default give_rep
