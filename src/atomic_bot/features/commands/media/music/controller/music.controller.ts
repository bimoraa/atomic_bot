/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 音乐控制中心：啥平台都能播，队列管理也一把梭 - \\
// - music core: handle all platforms and queues - \\
import { ChatInputCommandInteraction, Client, ButtonInteraction, TextChannel, GuildMember, VoiceBasedChannel, Message } from "discord.js"
import { Player }                                                                                               from "shoukaku"
import axios                                                                                                   from "axios"
import { component }                                                                                           from "@utils"
import { log_error }                                                                                           from "@utils/error_logger"
import {
  track_data,
  guild_queue,
  lavalink_track,
  lavalink_response,
}                                                                                                              from "@models/music.model"
import { get_shoukaku }                                                                                        from "@integrations/lavalink/shoukaku"

// ─── GUILD QUEUE MAP ──────────────────────────────────────────────────────────
const guild_queues = new Map<string, guild_queue>()

// ─── SPOTIFY TOKEN CACHE ──────────────────────────────────────────────────────
let __spotify_token     : string = ""
let __spotify_token_exp : number = 0

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const __idle_timeout_ms     = 5 * 60 * 1000  // - 5 min idle before leaving - \\
const __tracks_per_page     = 10
const __max_queue_size      = 100

// ─── PLATFORM DETECTION ───────────────────────────────────────────────────────
type platform_type = "spotify_track" | "spotify_album" | "spotify_playlist" | "apple_music" | "youtube" | "youtube_playlist" | "query"

/**
 * @description detects the source platform from the user-provided string.
 * @param {string} input - url or search query
 * @returns {platform_type}
 */
export function detect_platform(input: string): platform_type {
  if (/open\.spotify\.com\/track\//.test(input))    return "spotify_track"
  if (/open\.spotify\.com\/album\//.test(input))    return "spotify_album"
  if (/open\.spotify\.com\/playlist\//.test(input)) return "spotify_playlist"
  if (/music\.apple\.com\//.test(input))            return "apple_music"
  if (/youtube\.com\/playlist\?/.test(input))       return "youtube_playlist"
  if (/youtube\.com\/watch|youtu\.be\//.test(input)) return "youtube"
  return "query"
}

// ─── SPOTIFY API ──────────────────────────────────────────────────────────────
/**
 * @description gets a spotify access token using client credentials flow. caches token until expiry.
 * @returns {Promise<string>} access token
 */
async function get_spotify_token(): Promise<string> {
  if (__spotify_token && Date.now() < __spotify_token_exp) return __spotify_token

  const client_id     = process.env.SPOTIFY_CLIENT_ID     ?? ""
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET ?? ""

  if (!client_id || !client_secret) {
    throw new Error("Spotify credentials not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing)")
  }

  const creds = Buffer.from(`${client_id}:${client_secret}`).toString("base64")

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    { headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" } }
  )

  __spotify_token     = res.data.access_token as string
  __spotify_token_exp = Date.now() + (res.data.expires_in as number - 60) * 1000

  return __spotify_token
}

/**
 * @description fetches metadata for a single spotify track.
 * @param {string} url - spotify track url
 * @returns {Promise<{ title: string; author: string } | null>}
 */
async function fetch_spotify_track_info(url: string): Promise<{ title: string; author: string } | null> {
  const id = url.match(/track\/([A-Za-z0-9]+)/)?.[1]
  if (!id) return null

  const token = await get_spotify_token()
  const res   = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const title  = res.data.name as string
  const author = (res.data.artists as Array<{ name: string }>).map(a => a.name).join(", ")
  return { title, author }
}

/**
 * @description fetches all track metadata from a Spotify album (paginated, up to __max_queue_size).
 * @param {string} url - spotify album URL
 * @returns {Promise<Array<{ title: string; author: string }>>}
 */
async function fetch_spotify_album(url: string): Promise<Array<{ title: string; author: string }>> {
  const id = url.match(/album\/([A-Za-z0-9]+)/)?.[1]
  if (!id) return []

  const token   = await get_spotify_token()
  const results : Array<{ title: string; author: string }> = []
  let   next    : string | null = `https://api.spotify.com/v1/albums/${id}/tracks?limit=50`

  while (next && results.length < __max_queue_size) {
    const page_url : string = next
    const res               = await axios.get(page_url, { headers: { Authorization: `Bearer ${token}` } })
    const items             = res.data.items as Array<{ name: string; artists: Array<{ name: string }> }>

    for (const track of items) {
      results.push({ title: track.name, author: track.artists.map(a => a.name).join(", ") })
      if (results.length >= __max_queue_size) break
    }

    next = results.length < __max_queue_size ? (res.data.next as string | null) : null
  }

  return results
}

/**
 * @description fetches all track metadata from a Spotify playlist (paginated, up to __max_queue_size).
 * @param {string} url - spotify playlist URL
 * @returns {Promise<Array<{ title: string; author: string }>>}
 */
async function fetch_spotify_playlist(url: string): Promise<Array<{ title: string; author: string }>> {
  const id = url.match(/playlist\/([A-Za-z0-9]+)/)?.[1]
  if (!id) return []

  const token   = await get_spotify_token()
  const results : Array<{ title: string; author: string }> = []
  let   next    : string | null = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`

  while (next && results.length < __max_queue_size) {
    const page_url : string = next
    const res               = await axios.get(page_url, { headers: { Authorization: `Bearer ${token}` } })
    const items             = res.data.items as Array<{ track: { name: string; artists: Array<{ name: string }> } | null }>

    for (const item of items) {
      if (!item.track) continue
      results.push({ title: item.track.name, author: item.track.artists.map(a => a.name).join(", ") })
      if (results.length >= __max_queue_size) break
    }

    next = results.length < __max_queue_size ? (res.data.next as string | null) : null
  }

  return results
}

// ─── APPLE MUSIC SCRAPER ──────────────────────────────────────────────────────
/**
 * @description scrapes og:title and og:description from an Apple Music page to get track metadata.
 * @param {string} url - apple Music URL
 * @returns {Promise<{ title: string; author: string } | null>}
 */
async function fetch_apple_music_info(url: string): Promise<{ title: string; author: string } | null> {
  try {
    const res  = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; atomic-bot/1.0)" },
      timeout: 5000,
    })
    const html = res.data as string

    const title_match  = html.match(/<meta property="og:title" content="([^"]+)"/)
    const author_match = html.match(/<meta property="og:description" content="([^"]+)"/)

    if (!title_match) return null

    // - og:description for Apple Music is usually "Song · Year · Artist" - \\
    const raw_desc = author_match?.[1] ?? ""
    const author   = raw_desc.split(" · ").pop() ?? raw_desc

    return {
      title : title_match[1],
      author: author.replace(" on Apple Music", "").trim(),
    }
  } catch {
    return null
  }
}

// ─── LAVALINK RESOLVER ────────────────────────────────────────────────────────
/**
 * @description resolves a Lavalink identifier (URL or ytsearch:query) and returns the first track.
 * @param {string} identifier - lavalink search identifier
 * @returns {Promise<lavalink_track | null>}
 */
async function resolve_track(identifier: string): Promise<lavalink_track | null> {
  const node = get_shoukaku().getIdealNode()
  if (!node) throw new Error("No Lavalink nodes are connected. Make sure the Lavalink server is running.")

  const result = await node.rest.resolve(identifier) as lavalink_response

  if (result.loadType === "search") {
    const tracks = result.data as lavalink_track[]
    return tracks[0] ?? null
  }

  if (result.loadType === "track") {
    return result.data as lavalink_track
  }

  if (result.loadType === "playlist") {
    const playlist = result.data as { tracks: lavalink_track[] }
    return playlist.tracks[0] ?? null
  }

  // - empty or error loadType - \\
  return null
}

/**
 * @description resolves all tracks from a YouTube playlist.
 * @param {string} url - youTube playlist URL
 * @returns {Promise<lavalink_track[]>}
 */
async function resolve_playlist(url: string): Promise<lavalink_track[]> {
  const node = get_shoukaku().getIdealNode()
  if (!node) throw new Error("No Lavalink nodes are connected. Make sure the Lavalink server is running.")

  const result = await node.rest.resolve(url) as lavalink_response
  if (result.loadType !== "playlist") return []

  const playlist = result.data as { tracks: lavalink_track[] }
  return playlist.tracks.slice(0, __max_queue_size) ?? []
}

// ─── QUEUE MANAGEMENT ─────────────────────────────────────────────────────────
/**
 * @description schedules the bot to leave the voice channel after idle timeout.
 * @param {string}  guild_id - guild id
 * @param {Player}  player   - shoukaku player instance
 * @param {Client}  client   - discord client for sending messages
 */
function schedule_auto_leave(guild_id: string, player: Player, client: Client): void {
  const queue = guild_queues.get(guild_id)
  if (!queue) return

  if (queue.idle_timer) clearTimeout(queue.idle_timer)

  queue.idle_timer = setTimeout(async () => {
    try {
      get_shoukaku().leaveVoiceChannel(guild_id)
      guild_queues.delete(guild_id)

      const channel = await client.channels.fetch(queue.text_channel_id).catch(() => null) as TextChannel | null
      if (channel) {
        await channel.send({
          ...component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("555555"),
                components  : [
                  component.text("Disconnected from voice channel due to inactivity."),
                ],
              }),
            ],
          }),
        }).catch(() => {})
      }
    } catch { /* ignore */ }
  }, __idle_timeout_ms)
}

/**
 * @description plays the next track in the guild queue.
 *              Called internally when a track ends.
 * @param {string} guild_id - guild ID
 * @param {Player} player   - shoukaku player
 */
async function play_next(guild_id: string, player: Player): Promise<void> {
  const queue = guild_queues.get(guild_id)
  if (!queue || queue.tracks.length === 0) return

  const track = queue.tracks[0]
  await player.playTrack({ track: { encoded: track.encoded } })
}

/**
 * @description sets up Shoukaku player event handlers for a guild.
 * @param {Player}  player   - shoukaku player
 * @param {string}  guild_id - guild id
 * @param {Client}  client   - discord client
 */
function setup_player_events(player: Player, guild_id: string, client: Client): void {
  // - track start: send now playing message - \\
  player.on("start", async () => {
    const queue = guild_queues.get(guild_id)
    if (!queue || queue.tracks.length === 0) return

    // - cancel idle timer if active - \\
    if (queue.idle_timer) {
      clearTimeout(queue.idle_timer)
      queue.idle_timer = null
    }

    queue.is_playing = true
    queue.is_paused  = false

    const track   = queue.tracks[0]
    const channel = await client.channels.fetch(queue.text_channel_id).catch(() => null) as TextChannel | null
    if (!channel) return

    await channel.send({
      ...build_now_playing_message(track, queue.tracks.length),
    }).catch(() => {})
  })

  // - track end: advance queue or start idle timer - \\
  player.on("end", async (data: any) => {
    // - if track was replaced (skip), the skip handler already set up next track - \\
    if (data?.reason === "replaced") return

    const queue = guild_queues.get(guild_id)
    if (!queue) return

    if (!queue.loop) queue.tracks.shift()

    if (queue.tracks.length === 0) {
      queue.is_playing = false
      schedule_auto_leave(guild_id, player, client)
    } else {
      await play_next(guild_id, player)
    }
  })

  // - exception: skip broken track - \\
  player.on("exception", async (data: any) => {
    console.log(`[ - MUSIC - ] Track exception in guild ${guild_id}:`, data?.exception?.message ?? "unknown")

    const queue = guild_queues.get(guild_id)
    if (!queue) return

    queue.tracks.shift()

    if (queue.tracks.length > 0) {
      await play_next(guild_id, player)
    } else {
      queue.is_playing = false
      schedule_auto_leave(guild_id, player, client)
    }
  })

  // - player closed: cleanup - \\
  player.on("closed", () => {
    guild_queues.delete(guild_id)
  })
}

// ─── MESSAGE BUILDERS ─────────────────────────────────────────────────────────
/**
 * @description builds the "Now Playing" Component V2 message.
 * @param {track_data} track        - currently playing track
 * @param {number}     queue_length - total tracks in queue
 * @returns Component V2 message payload
 */
export function build_now_playing_message(track: track_data, queue_length: number) {
  const duration = format_duration(track.duration)
  const lines    = [
    `## Now Playing`,
    `**${track.title}**`,
    `by ${track.author}`,
    ``,
    `- Duration : ${duration}`,
    `- Requested by : <@${track.requester_id}>`,
    queue_length > 1 ? `- Up next   : ${queue_length - 1} track${queue_length - 1 > 1 ? "s" : ""} in queue` : "",
  ].filter(Boolean)

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("1DB954"),
        components  : [
          component.text(lines),
          component.divider(),
          component.action_row(
            component.secondary_button("Skip",  "music_skip"),
            component.secondary_button("Pause", "music_pause_resume"),
            component.secondary_button("Queue", "music_queue:1"),
            component.danger_button("Stop",     "music_stop"),
          ),
        ],
      }),
    ],
  })
}

/**
 * @description builds the "Added to Queue" Component V2 message.
 * @param {track_data} track    - track that was added
 * @param {number}     position - position in queue (1-indexed)
 * @returns Component V2 message payload
 */
export function build_added_to_queue_message(track: track_data, position: number) {
  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("5865F2"),
        components  : [
          component.text([
            `## Added to Queue`,
            `**${track.title}** — ${track.author}`,
            ``,
            `- Duration : ${format_duration(track.duration)}`,
            `- Position : #${position}`,
            `- Requested by : <@${track.requester_id}>`,
          ]),
        ],
      }),
    ],
  })
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
/**
 * @description formats milliseconds into a human-readable duration string.
 * @param {number} ms - duration in milliseconds
 * @returns {string} e.g. "3:45" or "1:03:20"
 */
export function format_duration(ms: number): string {
  const total_sec = Math.floor(ms / 1000)
  const hours     = Math.floor(total_sec / 3600)
  const minutes   = Math.floor((total_sec % 3600) / 60)
  const seconds   = total_sec % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

// ─── PUBLIC HANDLERS ──────────────────────────────────────────────────────────
/**
 * @description main /play handler. Detects platform, resolves track(s), joins VC, queues and plays.
 * @param {object} options - interaction, guild, voice channel, query, client, requester ID
 * @returns {Promise<void>}
 */
export async function handle_play(options: {
  interaction    : ChatInputCommandInteraction
  voice_channel  : VoiceBasedChannel
  query          : string
  client         : Client
}): Promise<void> {
  const { interaction, voice_channel, query, client } = options
  const guild_id     = interaction.guild!.id
  const user_id      = interaction.user.id
  const text_chan_id = interaction.channel!.id

  await interaction.deferReply()

  try {
    const platform = detect_platform(query)

    // ─ resolve track(s) into { title, author, source } tuples ─
    type meta = { title: string; author: string; source: string }
    const metas: meta[] = []

    if (platform === "spotify_track") {
      const info = await fetch_spotify_track_info(query)
      if (info) metas.push({ title: info.title, author: info.author, source: query })
    } else if (platform === "spotify_album") {
      const tracks = await fetch_spotify_album(query)
      tracks.forEach(t => metas.push({ title: t.title, author: t.author, source: query }))
    } else if (platform === "spotify_playlist") {
      const tracks = await fetch_spotify_playlist(query)
      tracks.forEach(t => metas.push({ title: t.title, author: t.author, source: query }))
    } else if (platform === "apple_music") {
      const info = await fetch_apple_music_info(query)
      if (info) metas.push({ title: info.title, author: info.author, source: query })
    } else if (platform === "youtube" || platform === "query") {
      // - resolve directly via Lavalink - \\
      const identifier = platform === "youtube" ? query : `ytsearch:${query}`
      const lv_track   = await resolve_track(identifier)

      if (!lv_track) {
        await interaction.editReply({
          ...component.build_message({
            components: [component.container({ components: [component.text("No results found for that query.")] })],
          }),
        })
        return
      }

      const resolved: track_data = {
        encoded     : lv_track.encoded,
        title       : lv_track.info.title,
        author      : lv_track.info.author,
        duration    : lv_track.info.length,
        uri         : lv_track.info.uri ?? query,
        artwork_url : lv_track.info.artworkUrl,
        requester_id: user_id,
        source_url  : query,
      }

      await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })

      const queue    = guild_queues.get(guild_id)
      const position = queue?.tracks.length ?? 1

      if (position === 1) {
        await interaction.editReply({
          ...component.build_message({
            components: [component.container({ components: [component.text("Playing now...") ] })],
          }),
        })
      } else {
        await interaction.editReply({ ...build_added_to_queue_message(resolved, position) })
      }
      return
    } else if (platform === "youtube_playlist") {
      // - youtube playlist tracks are already resolved: use directly, no ytsearch needed - \\
      const lv_tracks = await resolve_playlist(query)

      if (lv_tracks.length === 0) {
        await interaction.editReply({
          ...component.build_message({
            components: [component.container({ components: [component.text("Could not load that YouTube playlist. The link may be invalid or the playlist is private.")] })],
          }),
        })
        return
      }

      let first_yt : track_data | null = null
      let yt_count = 0

      for (const lt of lv_tracks) {
        const resolved: track_data = {
          encoded     : lt.encoded,
          title       : lt.info.title,
          author      : lt.info.author,
          duration    : lt.info.length,
          uri         : lt.info.uri ?? "",
          artwork_url : lt.info.artworkUrl,
          requester_id: user_id,
          source_url  : query,
        }
        await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })
        if (!first_yt) first_yt = resolved
        yt_count++
      }

      await interaction.editReply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("5865F2"),
              components  : [
                component.text([
                  `## Added ${yt_count} tracks to queue`,
                  `First: **${first_yt!.title}** — ${first_yt!.author}`,
                ]),
              ],
            }),
          ],
        }),
      })
      return
    }

    if (metas.length === 0) {
      await interaction.editReply({
        ...component.build_message({
          components: [component.container({ components: [component.text("Could not fetch track info from that link. Check your Spotify/Apple Music URL or try a search query instead.")] })],
        }),
      })
      return
    }

    // ─ for Spotify/Apple/YT-playlist: search each meta via ytsearch ─
    let first_resolved: track_data | null = null
    let queued_count = 0

    for (const meta of metas.slice(0, __max_queue_size)) {
      const lv_track = await resolve_track(`ytsearch:${meta.title} ${meta.author}`)
      if (!lv_track) continue

      const resolved: track_data = {
        encoded     : lv_track.encoded,
        title       : lv_track.info.title,
        author      : lv_track.info.author,
        duration    : lv_track.info.length,
        uri         : lv_track.info.uri ?? "",
        artwork_url : lv_track.info.artworkUrl,
        requester_id: user_id,
        source_url  : meta.source,
      }

      await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })
      if (!first_resolved) first_resolved = resolved
      queued_count++
    }

    if (!first_resolved) {
      await interaction.editReply({
        ...component.build_message({
          components: [component.container({ components: [component.text("Spotify metadata was fetched but no matching tracks were found on YouTube. The tracks may be region-locked or unavailable.")] })],
        }),
      })
      return
    }

    if (queued_count === 1) {
      const queue    = guild_queues.get(guild_id)
      const position = queue?.tracks.length ?? 1
      await interaction.editReply({
        ...(position === 1
          ? component.build_message({ components: [component.container({ components: [component.text("Playing now...") ] })] })
          : build_added_to_queue_message(first_resolved, position)
        ),
      })
    } else {
      await interaction.editReply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("5865F2"),
              components  : [
                component.text([
                  `## Added ${queued_count} tracks to queue`,
                  `First: **${first_resolved.title}** — ${first_resolved.author}`,
                ]),
              ],
            }),
          ],
        }),
      })
    }
  } catch (err) {
    await log_error(client, err as Error, "Music Handle Play", { guild_id, user_id, query }).catch(() => {})
    await interaction.editReply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred while processing your request.")] })],
      }),
    }).catch(() => {})
  }
}

/**
 * @description prefix (a!play) equivalent of handle_play. Uses Message.reply for responses.
 * @param {object} options - message, voice channel, query, client
 * @returns {Promise<void>}
 */
export async function handle_play_prefix(options: {
  message        : Message
  voice_channel  : VoiceBasedChannel
  query          : string
  client         : Client
}): Promise<void> {
  const { message, voice_channel, query, client } = options
  const guild_id     = message.guild!.id
  const user_id      = message.author.id
  const text_chan_id = message.channel.id

  const loading_msg = await message.reply({
    ...component.build_message({
      components: [
        component.container({
          components: [component.text(`Resolving **${query.length > 60 ? query.slice(0, 60) + "..." : query}**...`)],
        }),
      ],
    }),
  })

  try {
    const platform = detect_platform(query)

    // ─ resolve track(s) into { title, author, source } tuples ─
    type meta = { title: string; author: string; source: string }
    const metas: meta[] = []

    if (platform === "spotify_track") {
      const info = await fetch_spotify_track_info(query)
      if (info) metas.push({ title: info.title, author: info.author, source: query })
    } else if (platform === "spotify_album") {
      const tracks = await fetch_spotify_album(query)
      tracks.forEach(t => metas.push({ title: t.title, author: t.author, source: query }))
    } else if (platform === "spotify_playlist") {
      const tracks = await fetch_spotify_playlist(query)
      tracks.forEach(t => metas.push({ title: t.title, author: t.author, source: query }))
    } else if (platform === "apple_music") {
      const info = await fetch_apple_music_info(query)
      if (info) metas.push({ title: info.title, author: info.author, source: query })
    } else if (platform === "youtube" || platform === "query") {
      // - resolve directly via Lavalink - \\
      const identifier = platform === "youtube" ? query : `ytsearch:${query}`
      const lv_track   = await resolve_track(identifier)

      if (!lv_track) {
        await loading_msg.edit({
          ...component.build_message({
            components: [component.container({ components: [component.text("No results found for that query.")] })],
          }),
        })
        return
      }

      const resolved: track_data = {
        encoded     : lv_track.encoded,
        title       : lv_track.info.title,
        author      : lv_track.info.author,
        duration    : lv_track.info.length,
        uri         : lv_track.info.uri ?? query,
        artwork_url : lv_track.info.artworkUrl,
        requester_id: user_id,
        source_url  : query,
      }

      await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })

      const queue    = guild_queues.get(guild_id)
      const position = queue?.tracks.length ?? 1

      if (position === 1) {
        await loading_msg.edit({
          ...component.build_message({
            components: [component.container({ components: [component.text("Playing now...")] })],
          }),
        })
      } else {
        await loading_msg.edit({ ...build_added_to_queue_message(resolved, position) })
      }
      return
    } else if (platform === "youtube_playlist") {
      // - youtube playlist tracks are already resolved: use directly, no ytsearch needed - \\
      const lv_tracks = await resolve_playlist(query)

      if (lv_tracks.length === 0) {
        await loading_msg.edit({
          ...component.build_message({
            components: [component.container({ components: [component.text("Could not load that YouTube playlist. The link may be invalid or the playlist is private.")] })],
          }),
        })
        return
      }

      let first_yt : track_data | null = null
      let yt_count = 0

      for (const lt of lv_tracks) {
        const resolved: track_data = {
          encoded     : lt.encoded,
          title       : lt.info.title,
          author      : lt.info.author,
          duration    : lt.info.length,
          uri         : lt.info.uri ?? "",
          artwork_url : lt.info.artworkUrl,
          requester_id: user_id,
          source_url  : query,
        }
        await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })
        if (!first_yt) first_yt = resolved
        yt_count++
      }

      await loading_msg.edit({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("5865F2"),
              components  : [
                component.text([
                  `## Added ${yt_count} tracks to queue`,
                  `First: **${first_yt!.title}** — ${first_yt!.author}`,
                ]),
              ],
            }),
          ],
        }),
      })
      return
    }

    if (metas.length === 0) {
      await loading_msg.edit({
        ...component.build_message({
          components: [component.container({ components: [component.text("Could not fetch track info from that link. Check your Spotify/Apple Music URL or try a search query instead.")] })],
        }),
      })
      return
    }

    // ─ for Spotify/Apple/YT-playlist: search each meta via ytsearch ─
    let first_resolved: track_data | null = null
    let queued_count = 0

    for (const meta of metas.slice(0, __max_queue_size)) {
      const lv_track = await resolve_track(`ytsearch:${meta.title} ${meta.author}`)
      if (!lv_track) continue

      const resolved: track_data = {
        encoded     : lv_track.encoded,
        title       : lv_track.info.title,
        author      : lv_track.info.author,
        duration    : lv_track.info.length,
        uri         : lv_track.info.uri ?? "",
        artwork_url : lv_track.info.artworkUrl,
        requester_id: user_id,
        source_url  : meta.source,
      }

      await enqueue_and_play({ guild_id, resolved, voice_channel, text_chan_id, client })
      if (!first_resolved) first_resolved = resolved
      queued_count++
    }

    if (!first_resolved) {
      await loading_msg.edit({
        ...component.build_message({
          components: [component.container({ components: [component.text("Spotify metadata was fetched but no matching tracks were found on YouTube. The tracks may be region-locked or unavailable.")] })],
        }),
      })
      return
    }

    if (queued_count === 1) {
      const queue    = guild_queues.get(guild_id)
      const position = queue?.tracks.length ?? 1
      await loading_msg.edit({
        ...(position === 1
          ? component.build_message({ components: [component.container({ components: [component.text("Playing now...")] })] })
          : build_added_to_queue_message(first_resolved, position)
        ),
      })
    } else {
      await loading_msg.edit({
        ...component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("5865F2"),
              components  : [
                component.text([
                  `## Added ${queued_count} tracks to queue`,
                  `First: **${first_resolved.title}** — ${first_resolved.author}`,
                ]),
              ],
            }),
          ],
        }),
      })
    }
  } catch (err) {
    await log_error(client, err as Error, "Music Handle Play Prefix", { guild_id, user_id, query }).catch(() => {})
    await loading_msg.edit({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred while processing your request.")] })],
      }),
    }).catch(() => {})
  }
}

/**
 * @description joins VC (or reuses existing player) and adds track to the guild queue.
 *              Triggers play_next if the queue was previously empty.
 * @param {object} opts - guild_id, resolved track, voice channel, text channel, client
 */
async function enqueue_and_play(opts: {
  guild_id       : string
  resolved       : track_data
  voice_channel  : VoiceBasedChannel
  text_chan_id   : string
  client         : Client
}): Promise<void> {
  const { guild_id, resolved, voice_channel, text_chan_id, client } = opts
  const shoukaku = get_shoukaku()

  let player = shoukaku.players.get(guild_id) as Player | undefined

  if (!player) {
    player = await shoukaku.joinVoiceChannel({
      guildId  : guild_id,
      channelId: voice_channel.id,
      shardId  : 0,
      deaf     : true,
    })
    setup_player_events(player, guild_id, client)
  }

  let queue = guild_queues.get(guild_id)
  if (!queue) {
    queue = {
      tracks          : [],
      is_playing      : false,
      is_paused       : false,
      text_channel_id : text_chan_id,
      voice_channel_id: voice_channel.id,
      loop            : false,
      idle_timer      : null,
    }
    guild_queues.set(guild_id, queue)
  }

  // - cancel pending idle timer if user added a new track - \\
  if (queue.idle_timer) {
    clearTimeout(queue.idle_timer)
    queue.idle_timer = null
  }

  queue.tracks.push(resolved)

  // - if nothing was playing, start now - \\
  if (!queue.is_playing) {
    await player!.playTrack({ track: { encoded: resolved.encoded } })
  }
}

// ─── SKIP ─────────────────────────────────────────────────────────────────────
/**
 * @description skips one or more tracks in the guild queue.
 * @param {string} guild_id - guild ID
 * @param {number} amount   - number of tracks to skip (default 1)
 * @returns {Promise<{ success: boolean; skipped: string; up_next: string | null }>}
 */
export async function handle_skip(guild_id: string, amount = 1): Promise<{ success: boolean; skipped: string; up_next: string | null }> {
  const shoukaku = get_shoukaku()
  const player   = shoukaku.players.get(guild_id) as Player | undefined
  const queue    = guild_queues.get(guild_id)

  if (!player || !queue || !queue.is_playing) {
    return { success: false, skipped: "", up_next: null }
  }

  const skipped_title = queue.tracks[0]?.title ?? "Unknown"

  // - remove skipped tracks from the front - \\
  queue.tracks.splice(0, Math.min(amount, queue.tracks.length))

  if (queue.tracks.length > 0) {
    // - play next: REPLACED reasons tells end handler to do nothing - \\
    await player.playTrack({ track: { encoded: queue.tracks[0].encoded } })
    return { success: true, skipped: skipped_title, up_next: queue.tracks[0].title }
  } else {
    // - nothing left, stop and make player idle - \\
    await player.stopTrack()
    queue.is_playing = false
    return { success: true, skipped: skipped_title, up_next: null }
  }
}

// ─── STOP ─────────────────────────────────────────────────────────────────────
/**
 * @description stops playback, clears the queue, and leaves the voice channel.
 * @param {string} guild_id - guild ID
 * @returns {Promise<boolean>} true if was playing, false otherwise
 */
export async function handle_stop(guild_id: string): Promise<boolean> {
  const shoukaku = get_shoukaku()
  const queue    = guild_queues.get(guild_id)

  if (!queue) return false

  if (queue.idle_timer) {
    clearTimeout(queue.idle_timer)
    queue.idle_timer = null
  }

  queue.tracks     = []
  queue.is_playing = false

  shoukaku.leaveVoiceChannel(guild_id)
  guild_queues.delete(guild_id)

  return true
}

// ─── PAUSE / RESUME ────────────────────────────────────────────────────────────
/**
 * @description toggles pause/resume state of the current track.
 * @param {string} guild_id - guild ID
 * @returns {Promise<{ success: boolean; is_paused: boolean }>}
 */
export async function handle_pause_resume(guild_id: string): Promise<{ success: boolean; is_paused: boolean }> {
  const shoukaku = get_shoukaku()
  const player   = shoukaku.players.get(guild_id) as Player | undefined
  const queue    = guild_queues.get(guild_id)

  if (!player || !queue || !queue.is_playing) {
    return { success: false, is_paused: false }
  }

  const new_paused = !queue.is_paused
  await player.setPaused(new_paused)
  queue.is_paused  = new_paused

  return { success: true, is_paused: new_paused }
}

// ─── QUEUE DISPLAY ────────────────────────────────────────────────────────────
/**
 * @description builds a queue listing Component V2 message for the given guild.
 * @param {string} guild_id - guild ID
 * @param {number} page     - page number (1-indexed)
 * @returns Component V2 message payload or null if no queue
 */
export function build_queue_message(guild_id: string, page: number) {
  const queue = guild_queues.get(guild_id)

  if (!queue || queue.tracks.length === 0) {
    return component.build_message({
      components: [
        component.container({
          components: [component.text("The queue is empty.")],
        }),
      ],
    })
  }

  const total_pages = Math.ceil(queue.tracks.length / __tracks_per_page)
  const safe_page   = Math.min(Math.max(1, page), total_pages)
  const start       = (safe_page - 1) * __tracks_per_page
  const slice       = queue.tracks.slice(start, start + __tracks_per_page)

  const lines: string[] = [
    `## Queue (${queue.tracks.length} track${queue.tracks.length !== 1 ? "s" : ""})`,
    ``,
  ]

  slice.forEach((t, i) => {
    const idx   = start + i
    const label = idx === 0 ? "**[NOW]**" : `${idx + 1}.`
    lines.push(`${label} ${t.title} — ${t.author} (${format_duration(t.duration)})`)
  })

  if (total_pages > 1) {
    lines.push(``, `Page ${safe_page}/${total_pages}`)
  }

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("1DB954"),
        components  : [
          component.text(lines),
          ...(total_pages > 1 ? [
            component.divider(),
            component.action_row(
              component.secondary_button("Prev", `music_queue:${safe_page - 1}`, undefined, safe_page <= 1),
              component.secondary_button("Next", `music_queue:${safe_page + 1}`, undefined, safe_page >= total_pages),
            ),
          ] : []),
        ],
      }),
    ],
  })
}

/**
 * @description returns the current guild queue (read-only accessor).
 * @param {string} guild_id - guild ID
 * @returns {guild_queue | undefined}
 */
export function get_queue(guild_id: string): guild_queue | undefined {
  return guild_queues.get(guild_id)
}
