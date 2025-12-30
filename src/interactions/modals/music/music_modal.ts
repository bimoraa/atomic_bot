import {
  ModalSubmitInteraction,
  GuildMember,
  VoiceChannel,
}                    from "discord.js"
import { play_track } from "../../controllers/music_controller"

export async function handle_music_modal(interaction: ModalSubmitInteraction) {
  try {
    const [, source] = interaction.customId.split(":")
    const query      = interaction.fields.getTextInputValue("music_query")
    const member     = interaction.member as GuildMember
    const guild      = interaction.guild

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

    await interaction.deferReply({ ephemeral: true })

    const result = await play_track({
      client        : interaction.client,
      guild,
      member,
      query,
      voice_channel,
    })

    if (result.success) {
      await interaction.editReply({
        content: `✅ Now playing your requested track!`,
      })
    } else {
      await interaction.editReply({
        content: `❌ ${result.error || "Failed to play track"}`,
      })
    }
  } catch (error) {
    console.error("[music_modal] Error:", error)
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content   : "An error occurred while playing the track",
        ephemeral : true,
      })
    } else {
      await interaction.editReply({
        content: "An error occurred while playing the track",
      })
    }
  }
}
