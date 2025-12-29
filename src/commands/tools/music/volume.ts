import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                    from "discord.js"
import { Command }   from "../../../types/command"
import { set_volume } from "../../../interactions/controller/music_controller_distube"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the music volume")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume level (0-100)")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild
    const volume = interaction.options.getInteger("level", true)

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!member.voice.channel) {
      await interaction.reply({
        content   : "You need to be in a voice channel!",
        ephemeral : true,
      })
      return
    }

    const result = await set_volume({
      client : interaction.client,
      guild,
      volume,
    })

    if (result.success) {
      await interaction.reply({
        content   : result.message || "Volume updated",
        ephemeral : true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to set volume",
        ephemeral : true,
      })
    }
  },
}
