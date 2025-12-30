import { Client, GuildMember, VoiceChannel, Guild, GuildTextBasedChannel } from "discord.js"
import { getVoiceConnection } from "@discordjs/voice"
import { DisTube, Song, Queue, Events, Playlist } from "distube"
import { YouTubePlugin } from "@distube/youtube"
import yts from "yt-search"
import ffmpeg from "ffmpeg-static"
import { component } from "../../utils"
import { log_error } from "../../utils/error_logger"
import playdl from "play-dl"

let distube: DisTube | null = null

export function get_distube(client: Client): DisTube {
  if (!distube) {
    const ffmpeg_path = (ffmpeg as string) || "ffmpeg"

    distube = new DisTube(client, {
      emitNewSongOnly : false,
      nsfw            : false,
      plugins         : [],
      ffmpeg          : {
        path: ffmpeg_path,
      },
    })

    distube.on(Events.FINISH_SONG, (queue: Queue, song: Song) => {
      console.log(`[DisTube] Finished playing: ${song.name}`)
    })

    distube.on(Events.ADD_SONG, (queue: Queue, song: Song) => {
      console.log(`[DisTube] Track added: ${song.name}`)
    })

    distube.on(Events.ERROR, (error: Error, queue: Queue, song?: Song) => {
      console.error(`[DisTube] Error:`, error.message)
      void log_error(client, error, "distube_error", {
        queue      : queue?.id,
        song       : song?.name,
        error_stack: error.stack,
      })
    })

    distube.on(Events.FFMPEG_DEBUG, (debug: string) => {
      console.log(`[DisTube FFmpeg Debug]:`, debug)
    })
  }

  return distube
}

interface play_track_options {
  client        : Client
  guild         : Guild
  member        : GuildMember
  query         : string
  voice_channel : VoiceChannel
  fallback_query?: string
}

async function resolve_track_url(client: Client, query: string, fallback_query?: string) {
  try {
    const search_text = fallback_query || query
    
    if (playdl.yt_validate(query) === "video" || playdl.yt_validate(query) === "playlist") {
      return query
    }

    try {
      const search_results = await playdl.search(search_text, { limit: 1, source: { youtube: "video" } })
      
      if (search_results && search_results.length > 0) {
        return search_results[0].url
      }

      return search_text
    } catch (error) {
      await log_error(client, error as Error, "resolve_track_url_search", { query: search_text })
      return search_text
    }
  } catch (error) {
    await log_error(client, error as Error, "resolve_track_url_outer", { query })
    return fallback_query || query
  }
}

export async function play_track(options: play_track_options) {
  const { client, query, voice_channel, member } = options

  try {
    if (!voice_channel.joinable) {
      await log_error(client, new Error("Voice channel not joinable"), "play_track_joinable", {
        query,
        guild        : options.guild.id,
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
        guild        : options.guild.id,
        member       : member.id,
        channel_id   : voice_channel.id,
        channel_name : voice_channel.name,
      })
      return {
        success : false,
        error   : "I cannot speak in that voice channel (permission).",
      }
    }

    const existing_connection = getVoiceConnection(voice_channel.guild.id)

    if (existing_connection) {
      existing_connection.destroy()
    }

    const track_url = await resolve_track_url(client, query, options.fallback_query)

    const distube_instance = get_distube(client)

    try {
      let play_source: any = track_url
      
      if (playdl.yt_validate(track_url) === "video") {
        const stream = await playdl.stream(track_url)
        play_source = stream.stream
        console.log("[play-dl] Using play-dl direct stream")
      }
      
      await distube_instance.play(voice_channel, play_source, {
        member      : member,
        textChannel : undefined,
      })
    } catch (playError: any) {
      if (playError?.message?.includes("NOT_SUPPORTED_URL") || playError?.message?.includes("This url is not supported")) {
        const search_query = options.fallback_query || query
        
        await log_error(client, playError, "play_track_url_not_supported_fallback", {
          query,
          track_url,
          search_query,
          guild : options.guild.id,
        })
        
        try {
          await distube_instance.play(voice_channel, search_query, {
            member      : member,
            textChannel : undefined,
          })
        } catch (searchError: any) {
          await log_error(client, searchError, "play_track_search_fallback_failed", {
            query,
            fallback_query : options.fallback_query,
            guild          : options.guild.id,
          })
          throw searchError
        }
      } else {
        throw playError
      }
    }

    return { success: true }
  } catch (error: any) {
    await log_error(client, error, "play_track", {
      query,
      guild        : options.guild.id,
      member       : member.id,
      channel_id   : voice_channel.id,
      channel_name : voice_channel.name,
      resolved_url : playdl.yt_validate(query) !== false ? query : undefined,
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    distube_instance.pause(guild)
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    distube_instance.resume(guild)
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const skipped = await distube_instance.skip(guild)
    return {
      success : true,
      message : `Skipped: ${skipped.name}`,
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    await distube_instance.stop(guild)
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music in queue",
      }
    }

    const current = queue.songs[0]
    const upcoming = queue.songs.slice(1, 6)

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "Music Queue",
                "",
                `Now Playing: ${current.name}`,
                `By: ${current.uploader.name}`,
                `Duration: ${current.formattedDuration}`,
                "",
                upcoming.length > 0
                  ? `Next ${upcoming.length} track${upcoming.length > 1 ? "s" : ""}:`
                  : "No upcoming tracks",
                ...upcoming.map((song: Song, i: number) => `${i + 1}. ${song.name} - ${song.formattedDuration}`),
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const current = queue.songs[0]
    const progress = Math.floor((queue.currentTime / current.duration) * 100)

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "Now Playing",
                "",
                `Track: ${current.name}`,
                `Artist: ${current.uploader.name}`,
                `Duration: ${current.formattedDuration}`,
                `Progress: ${progress}%`,
                "",
                `Volume: ${queue.volume}%`,
                `Loop: ${queue.repeatMode === 0 ? "Off" : queue.repeatMode === 1 ? "Track" : "Queue"}`,
                `Paused: ${queue.paused ? "Yes" : "No"}`,
              ],
              thumbnail: current.thumbnail || "",
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    distube_instance.setVolume(guild, volume)
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
    const distube_instance = get_distube(client)
    const queue = distube_instance.getQueue(guild)

    if (!queue) {
      return {
        success : false,
        error   : "No music playing",
      }
    }

    const repeat_mode = mode === "off" ? 0 : mode === "track" ? 1 : 2
    distube_instance.setRepeatMode(guild, repeat_mode)
    
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
