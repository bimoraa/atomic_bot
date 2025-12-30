import {
  StringSelectMenuInteraction,
  GuildMember,
  VoiceChannel,
}                    from "discord.js"
import { play_track } from "../../controllers/music_controller"

const search_cache = new Map<string, any[]>()

export function cache_search_results(user_id: string, tracks: any[]) {
  search_cache.set(user_id, tracks)
  setTimeout(() => search_cache.delete(user_id), 300000)
}

export async function handle_music_play_select(interaction: StringSelectMenuInteraction) {
  try {
    const user_id = interaction.customId.split(":")[1]

    if (interaction.user.id !== user_id) {
      await interaction.reply({
        content   : "This is not your music selection",
        ephemeral : true,
      })
      return
    }

    const cached_tracks = search_cache.get(user_id)
    if (!cached_tracks) {
      await interaction.reply({
        content   : "Search results expired. Please use /play again",
        ephemeral : true,
      })
      return
    }

    const selected_index = parseInt(interaction.values[0])
    const selected_track = cached_tracks[selected_index]

    if (!selected_track) {
      await interaction.reply({
        content   : "Invalid track selection",
        ephemeral : true,
      })
      return
    }

    const member = interaction.member as GuildMember
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

    await interaction.deferReply({ ephemeral: true })

    await play_track({
      client         : interaction.client,
      guild,
      member,
      query          : selected_track.url,
      fallback_query : `${selected_track.title} ${selected_track.author}`,
      voice_channel  : voice_channel,
    })

    search_cache.delete(user_id)

    await interaction.editReply({
      content: `Now playing: ${selected_track.title} by ${selected_track.author}`,
    })
  } catch (error) {
    console.error("[music_play_select] Error:", error)
    
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
