import { Client, GuildMember, VoiceChannel, Guild } from "discord.js"
import DisTube from "distube"
import { component } from "../../utils"

let distube: DisTube | null = null

export function get_distube(client: Client): DisTube {
  if (!distube) {
    distube = new DisTube(client, {
      emitNewSongOnly : false,
      leaveOnEmpty    : true,
      leaveOnFinish   : false,
      leaveOnStop     : true,
      nsfw            : false,
      emptyCooldown   : 60,
    })

    distube.on("playSong", (queue, song) => {
      console.log(`[DisTube] Started playing: ${song.name}`)
    })

    distube.on("addSong", (queue, song) => {
      console.log(`[DisTube] Track added: ${song.name}`)
    })

    distube.on("error", (channel, error) => {
      console.error("[DisTube ERROR]", error)
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
}

export async function play_track(options: play_track_options) {
  const { client, query, voice_channel, member } = options

  try {
    const distube_instance = get_distube(client)

    await distube_instance.play(voice_channel, query, {
      member   : member,
      textChannel : undefined,
    })

    return { success: true }
  } catch (error: any) {
    console.error("[play_track] Error:", error)
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
  const { query, limit = 10, client } = options

  if (!client) {
    throw new Error("Client is required for search")
  }

  try {
    const distube_instance = get_distube(client)
    const results = await distube_instance.search(query, { limit })

    return results.map((song: any) => ({
      title     : song.name,
      author    : song.uploader.name,
      url       : song.url,
      duration  : song.formattedDuration,
      thumbnail : song.thumbnail,
    }))
  } catch (error) {
    console.error("[search_tracks] Error:", error)
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
    console.error("[pause_track] Error:", error)
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
    console.error("[resume_track] Error:", error)
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
    console.error("[skip_track] Error:", error)
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
    console.error("[stop_track] Error:", error)
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
                ...upcoming.map((song, i) => `${i + 1}. ${song.name} - ${song.formattedDuration}`),
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
    console.error("[get_queue] Error:", error)
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
    console.error("[now_playing] Error:", error)
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
    console.error("[set_volume] Error:", error)
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
    console.error("[set_loop] Error:", error)
    return {
      success : false,
      error   : error?.message || "Failed to set loop mode",
    }
  }
}
