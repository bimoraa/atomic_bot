import { Client, GuildMember, VoiceChannel, TextChannel, Guild } from "discord.js"
import { Player, Track, GuildQueue, QueueRepeatMode, QueryType } from "discord-player"
import { AttachmentExtractor, SoundCloudExtractor, SpotifyExtractor, VimeoExtractor, ReverbnationExtractor, AppleMusicExtractor } from "@discord-player/extractor"
import { component }                                           from "../../utils"
import { log_error }                                           from "../../utils/error_logger"

let player: Player | null = null
let extractors_loaded = false

export async function get_player(client: Client): Promise<Player> {
  if (!player) {
    player = new Player(client, {
      ytdlOptions: {
        quality        : "highestaudio",
        highWaterMark  : 1 << 25,
        filter         : "audioonly",
      },
    })
  }
  
  if (!extractors_loaded) {
    await player.extractors.register(SoundCloudExtractor, {})
    await player.extractors.register(AttachmentExtractor, {})
    await player.extractors.register(VimeoExtractor, {})
    await player.extractors.register(ReverbnationExtractor, {})
    await player.extractors.register(AppleMusicExtractor, {})
    await player.extractors.register(SpotifyExtractor, {})
    extractors_loaded = true
  }
  
  return player
}

interface play_track_options {
  client        : Client
  guild         : Guild
  member        : GuildMember
  query         : string
  voice_channel : VoiceChannel
}

interface queue_options {
  client : Client
  guild  : Guild
}

interface skip_track_options {
  client : Client
  guild  : Guild
}

interface pause_track_options {
  client : Client
  guild  : Guild
}

interface resume_track_options {
  client : Client
  guild  : Guild
}

interface stop_track_options {
  client : Client
  guild  : Guild
}

interface set_volume_options {
  client : Client
  guild  : Guild
  volume : number
}

interface set_loop_options {
  client : Client
  guild  : Guild
  mode   : "off" | "track" | "queue"
}

export async function play_track(options: play_track_options) {
  const { client, guild, member, query, voice_channel } = options

  try {
    const player_instance = await get_player(client)
    
    const result = await player_instance.search(query, {
      requestedBy: member.user,
    })

    if (!result || !result.tracks.length) {
      return {
        success : false,
        error   : "No results found for your query.",
      }
    }

    const queue = player_instance.nodes.create(guild, {
      metadata: {
        channel: voice_channel,
      },
      leaveOnEnd          : true,
      leaveOnStop         : true,
      leaveOnEmpty        : true,
      leaveOnEmptyCooldown: 60000,
      volume              : 50,
    })

    try {
      if (!queue.connection) {
        await queue.connect(voice_channel)
      }
    } catch {
      queue.delete()
      return {
        success : false,
        error   : "Could not join your voice channel!",
      }
    }

    const track = result.tracks[0]
    queue.addTrack(track)

    if (!queue.isPlaying()) {
      await queue.node.play()
    }

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "## Track Added",
                `**${track.title}**`,
                `- Duration: ${track.duration}`,
                `- Requested by: <@${member.id}>`,
                `- Position in queue: ${queue.tracks.size + 1}`,
              ],
              thumbnail: track.thumbnail || undefined,
            }),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
      track,
    }
  } catch (err) {
    await log_error(client, err as Error, "Play Track Controller", {
      guild_id : guild.id,
      query,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to play track",
    }
  }
}

export async function get_queue(options: queue_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    const current_track = queue.currentTrack
    const tracks        = queue.tracks.toArray().slice(0, 10)

    const queue_list = tracks.map((track: Track, i: number) => {
      return `${i + 1}. **${track.title}** - \`${track.duration}\``
    })

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.text("## Music Queue"),
          ],
        }),
        component.container({
          components: [
            component.text([
              "### Now Playing",
              `**${current_track.title}**`,
              `- Duration: ${current_track.duration}`,
              `- Requested by: <@${current_track.requestedBy?.id}>`,
            ]),
            component.divider(),
            component.text([
              "### Up Next",
              ...(queue_list.length > 0 ? queue_list : ["No tracks in queue"]),
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("⏸️ Pause", "music_pause"),
              component.secondary_button("⏭️ Skip", "music_skip"),
              component.danger_button("⏹️ Stop", "music_stop")
            ),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Get Queue Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to fetch queue",
    }
  }
}

export async function skip_track(options: skip_track_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    const skipped = queue.currentTrack
    queue.node.skip()

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.text([
              "## Track Skipped",
              `**${skipped.title}** has been skipped.`,
            ]),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Skip Track Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to skip track",
    }
  }
}

export async function pause_track(options: pause_track_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    if (queue.node.isPaused()) {
      return {
        success : false,
        error   : "Music is already paused!",
      }
    }

    queue.node.pause()

    return {
      success : true,
      message : "Music paused",
    }
  } catch (err) {
    await log_error(client, err as Error, "Pause Track Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to pause track",
    }
  }
}

export async function resume_track(options: resume_track_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    if (!queue.node.isPaused()) {
      return {
        success : false,
        error   : "Music is not paused!",
      }
    }

    queue.node.resume()

    return {
      success : true,
      message : "Music resumed",
    }
  } catch (err) {
    await log_error(client, err as Error, "Resume Track Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to resume track",
    }
  }
}

export async function stop_track(options: stop_track_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    queue.delete()

    return {
      success : true,
      message : "Music stopped and queue cleared",
    }
  } catch (err) {
    await log_error(client, err as Error, "Stop Track Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to stop track",
    }
  }
}

export async function set_volume(options: set_volume_options) {
  const { client, guild, volume } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    queue.node.setVolume(volume)

    return {
      success : true,
      message : `Volume set to ${volume}%`,
    }
  } catch (err) {
    await log_error(client, err as Error, "Set Volume Controller", {
      guild_id: guild.id,
      volume,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to set volume",
    }
  }
}

export async function set_loop(options: set_loop_options) {
  const { client, guild, mode } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    const loop_modes = {
      off   : QueueRepeatMode.OFF,
      track : QueueRepeatMode.TRACK,
      queue : QueueRepeatMode.QUEUE,
    }

    queue.setRepeatMode(loop_modes[mode])

    const mode_text = {
      off   : "Loop disabled",
      track : "Looping current track",
      queue : "Looping entire queue",
    }

    return {
      success : true,
      message : mode_text[mode],
    }
  } catch (err) {
    await log_error(client, err as Error, "Set Loop Controller", {
      guild_id: guild.id,
      mode,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to set loop mode",
    }
  }
}

export async function now_playing(options: queue_options) {
  const { client, guild } = options

  try {
    const player_instance = await get_player(client)
    const queue           = player_instance.nodes.get(guild.id)

    if (!queue || !queue.currentTrack) {
      return {
        success : false,
        error   : "No music is currently playing!",
      }
    }

    const track    = queue.currentTrack
    const progress = queue.node.createProgressBar() || "No progress bar available"

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                "## Now Playing",
                `**${track.title}**`,
                `- Duration: ${track.duration}`,
                `- Requested by: <@${track.requestedBy?.id}>`,
                `- Volume: ${queue.node.volume}%`,
                ``,
                progress,
              ],
              thumbnail: track.thumbnail || undefined,
            }),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("⏸️ Pause", "music_pause"),
              component.secondary_button("▶️ Resume", "music_resume"),
              component.secondary_button("⏭️ Skip", "music_skip"),
              component.danger_button("⏹️ Stop", "music_stop")
            ),
          ],
        }),
      ],
    })

    return {
      success : true,
      message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Now Playing Controller", {
      guild_id: guild.id,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to get now playing",
    }
  }
}

export async function search_tracks(query: string) {
  try {
    if (!player) {
      return {
        success : false,
        error   : "Music player not initialized",
      }
    }

    const result = await player.search(query, {
      requestedBy: "system",
      searchEngine: QueryType.AUTO,
    })

    if (!result || !result.tracks.length) {
      return {
        success : false,
        error   : "No results found",
      }
    }

    const tracks = result.tracks.slice(0, 10).map((track: Track) => ({
      title    : track.title,
      author   : track.author,
      duration : track.duration,
      url      : track.url,
    }))

    return {
      success : true,
      tracks,
    }
  } catch (err) {
    console.error("[search_tracks] Error:", err)
    return {
      success : false,
      error   : "Failed to search tracks",
    }
  }
}
