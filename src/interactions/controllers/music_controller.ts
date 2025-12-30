import { Client, GuildMember, VoiceChannel, Guild, GuildTextBasedChannel } from "discord.js"
import { Player, QueryType, Track, GuildQueue } from "discord-player"
import { component } from "../../utils"
import { log_error } from "../../utils/error_logger"
import yts from "yt-search"

let player: Player | null = null

export function get_player(client: Client): Player {
  if (!player) {
    player = new Player(client)

    player.extractors.loadDefault()
    
    player.events.on("playerStart", (queue: GuildQueue, track: Track) => {
      console.log(`[Player] Now playing: ${track.title}`)
    })

    player.events.on("error", (queue: GuildQueue, error: Error) => {
      console.error(`[Player] Error:`, error.message)
      void log_error(client, error, "player_error", {
        queue_guild: queue?.guild?.id,
      })
    })
  }

  return player
}

interface play_track_options {
  client        : Client
  guild         : Guild
  member        : GuildMember
  query         : string
  voice_channel : VoiceChannel
  fallback_query?: string
}

export async function play_track(options: play_track_options) {
  const { client, query, voice_channel, member, guild } = options

  try {
    if (!voice_channel.joinable) {
      await log_error(client, new Error("Voice channel not joinable"), "play_track_joinable", {
        query,
        guild        : guild.id,
        member       : member.id,
        channel_id   : voice_channel.id,
        channel_name : voice_channel.name,
      })
      return {
        success : false,
        error   : "I cannot join that voice channel (permission or full).",
      }
    }

    if (!voice_channel.speakable) {
      await log_error(client, new Error("Voice channel not speakable"), "play_track_speakable", {
        query,
        guild        : guild.id,
        member       : member.id,
        channel_id   : voice_channel.id,
        channel_name : voice_channel.name,
      })
      return {
        success : false,
        error   : "I cannot speak in that voice channel (permission).",
      }
    }

    const player_instance = get_player(client)

    const search_result = await player_instance.search(query, {
      requestedBy : member.user,
    })

    if (!search_result || !search_result.tracks || search_result.tracks.length === 0) {
      await log_error(client, new Error("No tracks found"), "play_track_no_results", {
        query,
        guild  : guild.id,
        member : member.id,
      })
      return {
        success : false,
        error   : "No tracks found for that query.",
      }
    }

    const queue_result = await player_instance.play(voice_channel, search_result, {
      nodeOptions: {
        metadata: {
          channel : voice_channel,
          guild   : guild,
        },
      },
    })

    console.log(`[discord-player] Track added: ${search_result.tracks[0].title}`)

    return { success: true }
  } catch (error: any) {
    await log_error(client, error, "play_track", {
      query,
      guild        : guild.id,
      member       : member.id,
      channel_id   : voice_channel.id,
      channel_name : voice_channel.name,
    })
    return {
      success : false,
      error   : error?.message || "Failed to play track",
    }
  }
}

interface search_tracks_options {
  query   : string
  limit?  : number
  client? : Client
}

export async function search_tracks(options: search_tracks_options) {
  const { query, client } = options

  if (!client) {
    throw new Error("Client is required for search")
  }

  try {
    const search_result = await yts.search({ query, hl: "en", gl: "US" })

    if (!search_result?.videos?.length) {
      return []
    }

    return search_result.videos.slice(0, 10).map((video: any) => ({
      title     : video.title,
      author    : video.author?.name || "Unknown",
      url       : video.url,
      duration  : video.timestamp || "Unknown",
      thumbnail : video.thumbnail,
    }))
  } catch (error) {
    await log_error(client, error as Error, "search_tracks", { query })
    return []
  }
}
export async function pause_track(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    queue.node.pause()
    return {
      success : true,
      message : "Music paused",
    }
  } catch (error: any) {
    await log_error(client, error, "pause_track", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to pause",
    }
  }
}

export async function resume_track(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    queue.node.resume()
    return {
      success : true,
      message : "Music resumed",
    }
  } catch (error: any) {
    await log_error(client, error, "resume_track", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to resume",
    }
  }
}

export async function skip_track(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const current_track = queue.currentTrack
    queue.node.skip()
    return {
      success : true,
      message : `Skipped: ${current_track?.title || "Unknown"}`,
    }
  } catch (error: any) {
    await log_error(client, error, "skip_track", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to skip",
    }
  }
}

export async function stop_track(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    queue.delete()
    return {
      success : true,
      message : "Music stopped and queue cleared",
    }
  } catch (error: any) {
    await log_error(client, error, "stop_track", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to stop",
    }
  }
}

export async function get_queue(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music in queue",
      }
    }

    const current = queue.currentTrack
    const upcoming = queue.tracks.toArray().slice(0, 5)

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "Music Queue",
                "",
                `Now Playing: ${current?.title || "Unknown"}`,
                `By: ${current?.author || "Unknown"}`,
                `Duration: ${current?.duration || "Unknown"}`,
                "",
                upcoming.length > 0
                  ? `Next ${upcoming.length} track${upcoming.length > 1 ? "s" : ""}:`
                  : "No upcoming tracks",
                ...upcoming.map((track, i: number) => `${i + 1}. ${track.title} - ${track.duration}`),
              ],
            }),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
    }
  } catch (error: any) {
    await log_error(client, error, "get_queue", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to get queue",
    }
  }
}

export async function now_playing(options: { client: Client; guild: Guild }) {
  const { client, guild } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const current = queue.currentTrack
    const progress = Math.floor((queue.node.getTimestamp()?.current.value || 0) / (current?.durationMS || 1) * 100)

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "Now Playing",
                "",
                `Track: ${current?.title || "Unknown"}`,
                `Artist: ${current?.author || "Unknown"}`,
                `Duration: ${current?.duration || "Unknown"}`,
                `Progress: ${progress}%`,
                "",
                `Volume: ${queue.node.volume}%`,
                `Loop: ${queue.repeatMode === 0 ? "Off" : queue.repeatMode === 1 ? "Track" : queue.repeatMode === 2 ? "Queue" : "Autoplay"}`,
                `Paused: ${queue.node.isPaused() ? "Yes" : "No"}`,
              ],
              thumbnail: current?.thumbnail || "",
            }),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
    }
  } catch (error: any) {
    await log_error(client, error, "now_playing", {
      guild : guild.id,
    })
    return {
      success : false,
      error   : error?.message || "Failed to get now playing",
    }
  }
}

export async function set_volume(options: { client: Client; guild: Guild; volume: number }) {
  const { client, guild, volume } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    queue.node.setVolume(volume)
    return {
      success : true,
      message : `Volume set to ${volume}%`,
    }
  } catch (error: any) {
    await log_error(client, error, "set_volume", {
      guild  : guild.id,
      volume : volume,
    })
    return {
      success : false,
      error   : error?.message || "Failed to set volume",
    }
  }
}

export async function set_loop(options: { client: Client; guild: Guild; mode: "off" | "track" | "queue" }) {
  const { client, guild, mode } = options

  try {
    const player_instance = get_player(client)
    const queue = player_instance.nodes.get(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const repeat_mode = mode === "off" ? 0 : mode === "track" ? 1 : 2
    queue.setRepeatMode(repeat_mode)
    
    return {
      success : true,
      message : `Loop mode set to: ${mode}`,
    }
  } catch (error: any) {
    await log_error(client, error, "set_loop", {
      guild : guild.id,
      mode  : mode,
    })
    return {
      success : false,
      error   : error?.message || "Failed to set loop mode",
    }
  }
}
