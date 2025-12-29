import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                     from "discord.js"
import { Command }    from "../../types/command"
import { stop_track } from "../../interactions/controller/music_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop music and clear the queue"),

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

    const result = await stop_track({
      client : interaction.client,
      guild,
    })

    if (result.success) {
      await interaction.reply({
        content   : result.message || "Music stopped",
        ephemeral : true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to stop",
        ephemeral : true,
      })
    }
  },
}
