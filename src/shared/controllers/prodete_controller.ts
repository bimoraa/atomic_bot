import { randomUUID }          from "crypto"
import { Client, TextChannel } from "discord.js"
import { db, logger }          from "@shared/utils"

export interface prodete_entry {
  rank              : number
  user_id           : string
  username          : string
  msg_count         : number
  claim_count       : number
  answer_count      : number
  total             : number
  percentage        : string
  channel_breakdown : Record<string, number>   // channel_id -> count
  ticket_breakdown  : Record<string, number>   // ticket_type -> count
  answer_breakdown  : Record<string, number>   // "YYYY-Www" -> count
}

export interface prodete_report {
  slug          : string
  from_date     : string
  to_date       : string
  from_ts       : number
  to_ts         : number
  entries       : prodete_entry[]
  channel_names : Record<string, string>   // channel_id -> real Discord channel name
  generated_by  : string
  generated_at  : number
}

// - CHANNELS TO COUNT MESSAGES FROM - \\
const __msg_channels: readonly string[] = [
  "1351969499116736602",
  "1398761098852958239",
  "1319275642277199902",
  "1446809167942910043",
  "1291781831775092847",
  "1398318499658600529",
]

// - TICKET TYPES TO COUNT CLAIMS FROM - \\
const __ticket_types: readonly string[] = ["priority", "helper"]

// - ONLY COUNT USERS WITH THIS STAFF ROLE - \\
const __staff_role_id = "1264915024707588208"

// - HUMAN-READABLE CHANNEL LABELS FOR WEB DISPLAY - \\
// - NOTE: these are fallbacks only — real names are fetched from Discord at scan time - \\
const __channel_label_fallback: Record<string, string> = {
  "1351969499116736602" : "1351969499116736602",
  "1398761098852958239" : "1398761098852958239",
  "1319275642277199902" : "1319275642277199902",
  "1446809167942910043" : "1446809167942910043",
  "1291781831775092847" : "1291781831775092847",
  "1398318499658600529" : "1398318499658600529",
}

const __discord_epoch        = BigInt(1420070400000)
const __max_iter_channel     = 500         // - 500 * 100 = 50k msgs per channel max - \\
const __channel_timeout_ms   = 120_000     // - 2 min hard cap per channel - \\
const __iter_delay_ms        = 50          // - ms between fetches per channel - \\

const log = logger.create_logger("prodete")

/**
 * Generates a UUID slug for a new ProDeTe report.
 * @returns UUID v4 string
 */
export function build_prodete_slug(): string {
  return randomUUID()
}

/**
 * Parses "DD-MM-YYYY" to WIB (UTC+7) day-start unix ms.
 * @param date_str "DD-MM-YYYY"
 * @returns unix ms
 */
function parse_date_wib_start(date_str: string): number {
  const [day, month, year] = date_str.split("-").map(Number)
  // - WIB midnight = UTC midnight - 7h - \\
  return Date.UTC(year, month - 1, day) - 7 * 3600 * 1000
}

/**
 * Converts a unix ms timestamp to a Discord snowflake string.
 * @param ts_ms unix timestamp in milliseconds
 * @returns snowflake string
 */
function ts_to_snowflake(ts_ms: number): string {
  return String((BigInt(ts_ms) - __discord_epoch) << BigInt(22))
}

/**
 * Returns all "YYYY-Www" week keys that overlap with the given range.
 * Uses the same week formula as answer_stats.
 * @param from_ts unix ms
 * @param to_ts   unix ms
 * @returns array of week key strings
 */
function get_week_keys_in_range(from_ts: number, to_ts: number): string[] {
  const keys = new Set<string>()
  const cur  = new Date(from_ts)
  const end  = new Date(to_ts)

  while (cur <= end) {
    const year  = cur.getFullYear()
    const start = new Date(year, 0, 1)
    const diff  = cur.getTime() - start.getTime()
    const week  = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
    keys.add(`${year}-W${week}`)
    cur.setDate(cur.getDate() + 7)
  }

  return Array.from(keys)
}

/**
 * Counts messages per user in a single text channel within [from_ts, to_ts].
 * Paginates BACKWARD from to_ts so we can stop the moment we pass from_ts —
 * much faster than forward pagination for bounded date ranges.
 * @param channel      TextChannel to scan
 * @param channel_name human-readable name for logging
 * @param from_ts      start unix ms inclusive
 * @param to_ts        end unix ms inclusive
 * @returns Map of user_id -> message count
 */
async function count_channel_messages(
  channel      : TextChannel,
  channel_name : string,
  from_ts      : number,
  to_ts        : number
): Promise<Map<string, number>> {
  const counts   = new Map<string, number>()
  // - START JUST PAST to_ts AND GO BACKWARD - \\
  let before_id  = ts_to_snowflake(to_ts + 1)
  let iterations = 0
  let total_msgs = 0
  const deadline = Date.now() + __channel_timeout_ms

  console.log(`[ - PRODETE - ] #${channel_name}: scan started (${new Date(from_ts).toISOString()} → ${new Date(to_ts).toISOString()})`)

  while (iterations < __max_iter_channel) {
    if (Date.now() > deadline) {
      console.warn(`[ - PRODETE - ] #${channel_name}: timeout after ${iterations} iters, ${total_msgs} msgs counted`)
      break
    }

    const batch = await channel.messages.fetch({ limit: 100, before: before_id, cache: false })

    if (batch.size === 0) {
      console.log(`[ - PRODETE - ] #${channel_name}: done — empty batch at iter ${iterations}, ${total_msgs} msgs`)
      break
    }

    // - SORT DESCENDING (NEWEST FIRST) SINCE WE PAGINATE BACKWARD - \\
    const sorted = [...batch.values()].sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? -1 : 1))

    let reached_start = false

    for (const msg of sorted) {
      // - SKIP MESSAGES OUTSIDE THE RANGE - \\
      if (msg.createdTimestamp > to_ts)   continue
      if (msg.createdTimestamp < from_ts) { reached_start = true; break }
      counts.set(msg.author.id, (counts.get(msg.author.id) ?? 0) + 1)
      total_msgs++
    }

    if (reached_start) {
      console.log(`[ - PRODETE - ] #${channel_name}: done — reached range start at iter ${iterations}, ${total_msgs} msgs`)
      break
    }

    // - OLDEST MSG IN BATCH BECOMES NEW UPPER BOUND - \\
    const oldest = sorted[sorted.length - 1]
    if (oldest) before_id = oldest.id

    iterations++

    if (iterations % 10 === 0) {
      console.log(`[ - PRODETE - ] #${channel_name}: iter ${iterations} — ${total_msgs} msgs so far`)
    }

    if (__iter_delay_ms > 0) await new Promise(r => setTimeout(r, __iter_delay_ms))
  }

  console.log(`[ - PRODETE - ] #${channel_name}: complete — ${counts.size} users, ${total_msgs} total messages`)
  return counts
}

/**
 * Aggregates message counts per channel per user across all tracked channels.
 * Also resolves real channel names from Discord.
 * @param client          Discord client
 * @param from_ts         start unix ms
 * @param to_ts           end unix ms
 * @param on_channel_done called when each channel finishes scanning
 * @returns channel_maps (channel_id → user_id → count) and channel_names (channel_id → name)
 */
async function aggregate_channel_messages(
  client           : Client,
  from_ts          : number,
  to_ts            : number,
  on_channel_done ?: (channel_id: string) => void
): Promise<{ channel_maps: Map<string, Map<string, number>>; channel_names: Record<string, string> }> {
  // - FETCH ALL CHANNELS IN PARALLEL FOR SPEED - \\
  const results = await Promise.allSettled(
    __msg_channels.map(async (channel_id) => {
      const ch = await client.channels.fetch(channel_id, { force: true, cache: false })
      if (!ch || !("messages" in ch)) {
        log.warn(`Channel ${channel_id} not accessible or not a text channel`)
        console.warn(`[ - PRODETE - ] channel ${channel_id}: not accessible`)
        on_channel_done?.(channel_id)
        return { channel_id, name: channel_id, counts: new Map<string, number>() }
      }
      const real_name = (ch as TextChannel).name
      const counts    = await count_channel_messages(ch as TextChannel, real_name, from_ts, to_ts)
      const total     = [...counts.values()].reduce((a, b) => a + b, 0)
      console.log(`[ - PRODETE - ] #${real_name}: ${counts.size} users, ${total} messages`)
      on_channel_done?.(channel_id)
      return { channel_id, name: real_name, counts }
    })
  )

  const channel_maps  = new Map<string, Map<string, number>>()
  const channel_names : Record<string, string> = {}

  for (const result of results) {
    if (result.status === "rejected") {
      log.error(`Failed to count a channel: ${(result.reason as Error).message}`)
      continue
    }
    if (!result.value) continue
    channel_maps.set(result.value.channel_id, result.value.counts)
    channel_names[result.value.channel_id] = result.value.name
  }

  return { channel_maps, channel_names }
}

/**
 * Counts ticket claims per staff in __ticket_types within the date range.
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> claim count
 */
/**
 * Counts ticket claims per staff broken down by ticket type.
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> { ticket_type -> count }
 */
async function count_ticket_claims(from_ts: number, to_ts: number): Promise<Map<string, Record<string, number>>> {
  const counts = new Map<string, Record<string, number>>()
  if (!db.is_connected()) return counts

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{ claimed_by: string; ticket_type: string; n: string }>(`
      SELECT
        claimed_by,
        ticket_type,
        COUNT(*) AS n
      FROM ticket_transcripts
      WHERE claimed_by  IS NOT NULL
        AND ticket_type  = ANY($1)
        AND close_time  >= $2
        AND close_time  <= $3
      GROUP BY claimed_by, ticket_type
    `, [__ticket_types, from_ts, to_ts])

    for (const row of result.rows) {
      if (!counts.has(row.claimed_by)) counts.set(row.claimed_by, {})
      counts.get(row.claimed_by)![row.ticket_type] = Number(row.n)
    }
  } catch (err) {
    log.error(`Failed to count ticket claims: ${(err as Error).message}`)
  }

  return counts
}

/**
 * Counts ask-staff answers per staff for weeks overlapping the given range.
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> answer count
 */
/**
 * Counts ask-staff answers per staff broken down by week for weeks in range.
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> { "YYYY-Www" -> count }
 */
async function count_ask_answers(from_ts: number, to_ts: number): Promise<Map<string, Record<string, number>>> {
  const counts    = new Map<string, Record<string, number>>()
  if (!db.is_connected()) return counts

  const week_keys = get_week_keys_in_range(from_ts, to_ts)

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{ staff_id: string; weekly: Record<string, number> }>(
      `SELECT staff_id, weekly FROM answer_stats`
    )

    for (const row of result.rows) {
      const breakdown: Record<string, number> = {}
      let   total = 0

      for (const wk of week_keys) {
        const val = row.weekly?.[wk] ?? 0
        if (val > 0) { breakdown[wk] = val; total += val }
      }

      if (total > 0) counts.set(row.staff_id, breakdown)
    }
  } catch (err) {
    log.error(`Failed to count ask answers: ${(err as Error).message}`)
  }

  return counts
}

/**
 * Resolves a display name for a user ID via guild member cache.
 * @param client   Discord client
 * @param guild_id Guild to search in
 * @param user_id  Target user ID
 * @returns display name or last 4 chars of user_id as fallback
 */
async function resolve_username(client: Client, guild_id: string, user_id: string): Promise<string> {
  try {
    const guild  = client.guilds.cache.get(guild_id)
    if (!guild) return user_id.slice(-4)
    const member = guild.members.cache.get(user_id)
      ?? await guild.members.fetch(user_id).catch(() => null)
    return member?.displayName ?? member?.user.username ?? user_id.slice(-4)
  } catch {
    return user_id.slice(-4)
  }
}

/**
 * Fetches all member IDs that have the staff role from the guild.
 * @param client   Discord client
 * @param guild_id Target guild ID
 * @returns Set of user IDs with the staff role
 */
async function get_role_member_ids(client: Client, guild_id: string): Promise<Set<string>> {
  const ids = new Set<string>()

  try {
    const guild = client.guilds.cache.get(guild_id) ?? await client.guilds.fetch(guild_id)
    if (!guild) return ids

    // - FETCH MEMBERS TO POPULATE CACHE, THEN FILTER BY ROLE - \\
    await guild.members.fetch()
    const role = guild.roles.cache.get(__staff_role_id)

    if (!role) {
      log.warn(`Staff role ${__staff_role_id} not found in guild ${guild_id}`)
      return ids
    }

    for (const [member_id] of role.members) {
      ids.add(member_id)
    }

    log.info(`Staff role has ${ids.size} members`)
    console.log(`[ - PRODETE - ] staff role ${__staff_role_id}: ${ids.size} members found`)
  } catch (err) {
    log.error(`Failed to fetch role members: ${(err as Error).message}`)
  }

  return ids
}

/**
 * Builds a ProDeTe report for the given date range, saves it to DB, and returns it.
 * @param client        Discord client
 * @param guild_id      Guild to resolve member names in
 * @param from_date     "DD-MM-YYYY"
 * @param to_date       "DD-MM-YYYY"
 * @param triggered_by  user_id of the command caller
 * @returns prodete_report
 */
export async function build_prodete_report(
  client       : Client,
  guild_id     : string,
  from_date    : string,
  to_date      : string,
  triggered_by : string,
  on_progress ?: (message: string, done: number, total: number) => Promise<void>
): Promise<prodete_report> {
  const from_ts    = parse_date_wib_start(from_date)
  const to_ts      = parse_date_wib_start(to_date) + 86400 * 1000 - 1
  const slug       = build_prodete_slug()
  const __steps    = __msg_channels.length + 2
  let   __done     = 0

  // - FIRE-AND-FORGET PROGRESS TICK - \\
  const tick = (label: string): void => {
    __done++
    on_progress?.(label, __done, __steps).catch(() => {})
  }

  log.info(`Building ProDeTe report ${from_date} -> ${to_date} (${slug})`)
  console.log(`[ - PRODETE - ] building report ${from_date} -> ${to_date}`)
  console.log(`[ - PRODETE - ] range: ${new Date(from_ts).toISOString()} -> ${new Date(to_ts).toISOString()}`)
  console.log(`[ - PRODETE - ] scanning ${__msg_channels.length} channels in parallel...`)

  // - PARALLEL CHANNEL SCAN — TICK AFTER EACH CHANNEL COMPLETES - \\
  const { channel_maps, channel_names } = await aggregate_channel_messages(
    client, from_ts, to_ts,
    (ch_id) => tick(`Channel scanned (${ch_id})`)
  )

  // - BUILD TOTAL MSG MAP + PER-USER CHANNEL BREAKDOWN - \\
  const msg_map   = new Map<string, number>()
  const ch_detail = new Map<string, Record<string, number>>()

  for (const [ch_id, user_map] of channel_maps) {
    for (const [uid, n] of user_map) {
      msg_map.set(uid, (msg_map.get(uid) ?? 0) + n)
      if (!ch_detail.has(uid)) ch_detail.set(uid, {})
      ch_detail.get(uid)![ch_id] = n
    }
  }

  const ticket_maps = await count_ticket_claims(from_ts, to_ts)
  console.log(`[ - PRODETE - ] ticket claims loaded`)
  tick("Ticket claims loaded")

  const answer_maps = await count_ask_answers(from_ts, to_ts)
  console.log(`[ - PRODETE - ] ask answers loaded`)
  tick("Ask answers loaded")

  // - BUILD TOTAL MAPS FROM BREAKDOWNS - \\
  const claim_map  = new Map<string, number>()
  const answer_map = new Map<string, number>()

  for (const [uid, bd] of ticket_maps) claim_map.set(uid, Object.values(bd).reduce((a, b) => a + b, 0))
  for (const [uid, bd] of answer_maps) answer_map.set(uid, Object.values(bd).reduce((a, b) => a + b, 0))

  // - FETCH ONLY MEMBERS WITH THE STAFF ROLE - \\
  const role_member_ids = await get_role_member_ids(client, guild_id)
  console.log(`[ - PRODETE - ] filtering by role: ${role_member_ids.size} staff members`)

  const all_ids = new Set([
    ...msg_map.keys(),
    ...claim_map.keys(),
    ...answer_map.keys(),
  ].filter(id => role_member_ids.has(id)))

  const raw: Omit<prodete_entry, "rank" | "percentage">[] = []

  for (const uid of all_ids) {
    const msg_count    = msg_map.get(uid)    ?? 0
    const claim_count  = claim_map.get(uid)  ?? 0
    const answer_count = answer_map.get(uid) ?? 0
    const total        = msg_count + claim_count + answer_count

    if (total === 0) continue

    const username = await resolve_username(client, guild_id, uid)

    raw.push({
      user_id           : uid,
      username,
      msg_count,
      claim_count,
      answer_count,
      total,
      channel_breakdown : ch_detail.get(uid)   ?? {},
      ticket_breakdown  : ticket_maps.get(uid) ?? {},
      answer_breakdown  : answer_maps.get(uid) ?? {},
    })
  }

  const grand_total = raw.reduce((s, e) => s + e.total, 0)

  const entries: prodete_entry[] = raw
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({
      ...e,
      rank       : i + 1,
      percentage : grand_total > 0 ? ((e.total / grand_total) * 100).toFixed(2) : "0.00",
    }))

  const report: prodete_report = {
    slug,
    from_date,
    to_date,
    from_ts,
    to_ts,
    entries,
    channel_names,
    generated_by  : triggered_by,
    generated_at  : Date.now(),
  }

  await save_prodete_report(report)

  log.info(`ProDeTe done: ${entries.length} staff — slug: ${slug}`)
  console.log(`[ - PRODETE - ] report complete: ${entries.length} staff, grand total ${grand_total} activity points, slug: ${slug}`)

  return report
}

/**
 * Upserts a prodete report to the database by slug.
 * @param report prodete_report to persist
 */
async function save_prodete_report(report: prodete_report): Promise<void> {
  if (!db.is_connected()) return

  try {
    const pool = db.get_pool()
    await pool.query(`
      INSERT INTO prodete_reports (slug, from_date, to_date, entries, channel_names, generated_by, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (slug) DO UPDATE SET
        entries       = EXCLUDED.entries,
        channel_names = EXCLUDED.channel_names,
        generated_by  = EXCLUDED.generated_by,
        generated_at  = EXCLUDED.generated_at
    `, [
      report.slug,
      report.from_date,
      report.to_date,
      JSON.stringify(report.entries),
      JSON.stringify(report.channel_names),
      report.generated_by,
      report.generated_at,
    ])
  } catch (err) {
    log.error(`Failed to save ProDeTe report: ${(err as Error).message}`)
  }
}

/**
 * Retrieves a saved prodete report from the database by date range.
 * Used for cache lookup before generating a new report.
 * @param from_date "DD-MM-YYYY"
 * @param to_date   "DD-MM-YYYY"
 * @returns prodete_report or null if not found
 */
export async function get_prodete_report_by_dates(from_date: string, to_date: string): Promise<prodete_report | null> {
  if (!db.is_connected()) return null

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{
      slug          : string
      from_date     : string
      to_date       : string
      entries       : prodete_entry[] | string
      channel_names : Record<string, string> | string | null
      generated_by  : string
      generated_at  : string
    }>(`
      SELECT slug, from_date, to_date, entries, channel_names, generated_by, generated_at
      FROM prodete_reports
      WHERE from_date = $1 AND to_date = $2
      ORDER BY generated_at DESC
      LIMIT 1
    `, [from_date, to_date])

    if (result.rows.length === 0) return null

    const row = result.rows[0]

    return {
      slug          : row.slug,
      from_date     : row.from_date,
      to_date       : row.to_date,
      from_ts       : parse_date_wib_start(row.from_date),
      to_ts         : parse_date_wib_start(row.to_date) + 86400 * 1000 - 1,
      entries       : typeof row.entries === "string" ? JSON.parse(row.entries) : row.entries,
      channel_names : row.channel_names == null ? {} : typeof row.channel_names === "string" ? JSON.parse(row.channel_names) : row.channel_names,
      generated_by  : row.generated_by,
      generated_at  : Number(row.generated_at),
    }
  } catch (err) {
    log.error(`Failed to get ProDeTe report by dates: ${(err as Error).message}`)
    return null
  }
}

/**
 * Retrieves a saved prodete report from the database by UUID slug.
 * @param slug UUID string
 * @returns prodete_report or null if not found
 */
export async function get_prodete_report(slug: string): Promise<prodete_report | null> {
  if (!db.is_connected()) return null

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{
      slug          : string
      from_date     : string
      to_date       : string
      entries       : prodete_entry[] | string
      channel_names : Record<string, string> | string | null
      generated_by  : string
      generated_at  : string
    }>(`
      SELECT slug, from_date, to_date, entries, channel_names, generated_by, generated_at
      FROM prodete_reports
      WHERE slug = $1
    `, [slug])

    if (result.rows.length === 0) return null

    const row = result.rows[0]

    return {
      slug          : row.slug,
      from_date     : row.from_date,
      to_date       : row.to_date,
      from_ts       : parse_date_wib_start(row.from_date),
      to_ts         : parse_date_wib_start(row.to_date) + 86400 * 1000 - 1,
      entries       : typeof row.entries === "string" ? JSON.parse(row.entries) : row.entries,
      channel_names : row.channel_names == null ? {} : typeof row.channel_names === "string" ? JSON.parse(row.channel_names) : row.channel_names,
      generated_by  : row.generated_by,
      generated_at  : Number(row.generated_at),
    }
  } catch (err) {
    log.error(`Failed to get ProDeTe report: ${(err as Error).message}`)
    return null
  }
}

/**
 * Lists all saved prodete report slugs ordered by generated_at desc.
 * @returns array of { slug, from_date, to_date, generated_at }
 */
export async function list_prodete_reports(): Promise<{ slug: string; from_date: string; to_date: string; generated_at: number }[]> {
  if (!db.is_connected()) return []

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{
      slug         : string
      from_date    : string
      to_date      : string
      generated_at : string
    }>(`
      SELECT slug, from_date, to_date, generated_at
      FROM prodete_reports
      ORDER BY generated_at DESC
      LIMIT 50
    `)

    return result.rows.map(r => ({
      slug         : r.slug,
      from_date    : r.from_date,
      to_date      : r.to_date,
      generated_at : Number(r.generated_at),
    }))
  } catch (err) {
    log.error(`Failed to list ProDeTe reports: ${(err as Error).message}`)
    return []
  }
}
