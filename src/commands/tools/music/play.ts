import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  VoiceChannel,
}                     from "discord.js"
import { Command }    from "../../types/command"
import { play_track } from "../../interactions/controller/music_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube or Spotify")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const query  = interaction.options.getString("query", true)
    const guild  = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    const voice_channel = member.voice.channel as VoiceChannel

    if (!voice_channel) {
      await interaction.reply({
        content   : "You need to be in a voice channel to play music!",
        ephemeral : true,
      })
      return
    }

    if (!voice_channel.joinable) {
      await interaction.reply({
        content   : "I cannot join your voice channel!",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply()

    const result = await play_track({
      client        : interaction.client,
      guild,
      member,
      query,
      voice_channel,
    })

    if (result.success) {
      await interaction.editReply(result.message!)
    } else {
      await interaction.editReply({
        content: result.error || "Failed to play track",
      })
    }
  },
}
