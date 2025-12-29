import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                     from "discord.js"
import { Command }    from "../../../types/command"
import { pause_track } from "../../../interactions/controller/music_controller_distube"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild

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

    const result = await pause_track({
      client : interaction.client,
      guild,
    })

    if (result.success) {
      await interaction.reply({
        content   : result.message || "Music paused",
        ephemeral : true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to pause",
        ephemeral : true,
      })
    }
  },
}
