import { Client, TextChannel } from "discord.js"
import { db, logger }          from "@shared/utils"

export interface prodete_entry {
  rank         : number
  user_id      : string
  username     : string
  msg_count    : number
  claim_count  : number
  answer_count : number
  total        : number
  percentage   : string
}

export interface prodete_report {
  slug         : string
  from_date    : string
  to_date      : string
  from_ts      : number
  to_ts        : number
  entries      : prodete_entry[]
  generated_by : string
  generated_at : number
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

const __discord_epoch    = BigInt(1420070400000)
const __max_iter_channel = 200 // - ~20000 messages per channel max - \\

const log = logger.create_logger("prodete")

/**
 * Builds the URL slug for a ProDeTe report.
 * @param from_date "DD-MM-YYYY"
 * @param to_date   "DD-MM-YYYY"
 * @returns "DDMMYYYY-DDMMYYYY"
 */
export function build_prodete_slug(from_date: string, to_date: string): string {
  return `${from_date.replace(/-/g, "")}-${to_date.replace(/-/g, "")}`
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
 * @param channel  TextChannel to scan
 * @param from_ts  start unix ms inclusive
 * @param to_ts    end unix ms inclusive
 * @returns Map of user_id -> message count
 */
async function count_channel_messages(
  channel : TextChannel,
  from_ts : number,
  to_ts   : number
): Promise<Map<string, number>> {
  const counts   = new Map<string, number>()
  let after_id   = ts_to_snowflake(from_ts - 1)
  let done       = false
  let iterations = 0

  while (!done && iterations < __max_iter_channel) {
    const batch = await channel.messages.fetch({ limit: 100, after: after_id, cache: false })

    if (batch.size === 0) break

    // - SORT ASCENDING SO WE ITERATE OLDEST FIRST - \\
    const sorted = batch.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))

    for (const msg of sorted.values()) {
      if (msg.createdTimestamp > to_ts) {
        done = true
        break
      }
      counts.set(msg.author.id, (counts.get(msg.author.id) ?? 0) + 1)
    }

    const last = sorted.last()
    if (!done && last) after_id = last.id

    iterations++

    // - RATE LIMIT SAFETY DELAY - \\
    await new Promise(r => setTimeout(r, 300))
  }

  return counts
}

/**
 * Aggregates message counts across all __msg_channels.
 * @param client  Discord client
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> total message count
 */
async function aggregate_channel_messages(
  client  : Client,
  from_ts : number,
  to_ts   : number
): Promise<Map<string, number>> {
  const totals = new Map<string, number>()

  for (const channel_id of __msg_channels) {
    try {
      const ch = await client.channels.fetch(channel_id, { force: false, cache: true })
      if (!ch || !("messages" in ch)) {
        log.warn(`Channel ${channel_id} not accessible or not a text channel`)
        continue
      }

      const counts = await count_channel_messages(ch as TextChannel, from_ts, to_ts)

      for (const [uid, n] of counts) {
        totals.set(uid, (totals.get(uid) ?? 0) + n)
      }

      log.info(`Channel ${channel_id}: ${counts.size} active users`)
    } catch (err) {
      log.error(`Failed to count channel ${channel_id}: ${(err as Error).message}`)
    }
  }

  return totals
}

/**
 * Counts ticket claims per staff in __ticket_types within the date range.
 * @param from_ts start unix ms
 * @param to_ts   end unix ms
 * @returns Map of user_id -> claim count
 */
async function count_ticket_claims(from_ts: number, to_ts: number): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!db.is_connected()) return counts

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{ claimed_by: string; n: string }>(`
      SELECT
        claimed_by,
        COUNT(*) AS n
      FROM ticket_transcripts
      WHERE claimed_by  IS NOT NULL
        AND ticket_type  = ANY($1)
        AND close_time  >= $2
        AND close_time  <= $3
      GROUP BY claimed_by
    `, [__ticket_types, from_ts, to_ts])

    for (const row of result.rows) {
      counts.set(row.claimed_by, Number(row.n))
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
async function count_ask_answers(from_ts: number, to_ts: number): Promise<Map<string, number>> {
  const counts    = new Map<string, number>()
  if (!db.is_connected()) return counts

  const week_keys = get_week_keys_in_range(from_ts, to_ts)

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{ staff_id: string; weekly: Record<string, number> }>(
      `SELECT staff_id, weekly FROM answer_stats`
    )

    for (const row of result.rows) {
      const sum = week_keys.reduce((acc, wk) => acc + (row.weekly?.[wk] ?? 0), 0)
      if (sum > 0) counts.set(row.staff_id, sum)
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
  triggered_by : string
): Promise<prodete_report> {
  const from_ts = parse_date_wib_start(from_date)
  const to_ts   = parse_date_wib_start(to_date) + 86400 * 1000 - 1
  const slug    = build_prodete_slug(from_date, to_date)

  log.info(`Building ProDeTe report ${from_date} -> ${to_date} (${slug})`)

  // - FETCH ALL THREE SOURCES IN SEQUENCE (CHANNELS TAKE MOST TIME) - \\
  const msg_map    = await aggregate_channel_messages(client, from_ts, to_ts)
  const claim_map  = await count_ticket_claims(from_ts, to_ts)
  const answer_map = await count_ask_answers(from_ts, to_ts)

  const all_ids = new Set([
    ...msg_map.keys(),
    ...claim_map.keys(),
    ...answer_map.keys(),
  ])

  const raw: Omit<prodete_entry, "rank" | "percentage">[] = []

  for (const uid of all_ids) {
    const msg_count    = msg_map.get(uid)    ?? 0
    const claim_count  = claim_map.get(uid)  ?? 0
    const answer_count = answer_map.get(uid) ?? 0
    const total        = msg_count + claim_count + answer_count

    if (total === 0) continue

    const username = await resolve_username(client, guild_id, uid)
    raw.push({ user_id: uid, username, msg_count, claim_count, answer_count, total })
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
    generated_by : triggered_by,
    generated_at : Date.now(),
  }

  await save_prodete_report(report)

  log.info(`ProDeTe done: ${entries.length} staff — slug: ${slug}`)

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
      INSERT INTO prodete_reports (slug, from_date, to_date, entries, generated_by, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET
        entries      = EXCLUDED.entries,
        generated_by = EXCLUDED.generated_by,
        generated_at = EXCLUDED.generated_at
    `, [
      report.slug,
      report.from_date,
      report.to_date,
      JSON.stringify(report.entries),
      report.generated_by,
      report.generated_at,
    ])
  } catch (err) {
    log.error(`Failed to save ProDeTe report: ${(err as Error).message}`)
  }
}

/**
 * Retrieves a saved prodete report from the database by slug.
 * @param slug "DDMMYYYY-DDMMYYYY"
 * @returns prodete_report or null if not found
 */
export async function get_prodete_report(slug: string): Promise<prodete_report | null> {
  if (!db.is_connected()) return null

  try {
    const pool   = db.get_pool()
    const result = await pool.query<{
      slug         : string
      from_date    : string
      to_date      : string
      entries      : prodete_entry[] | string
      generated_by : string
      generated_at : string
    }>(`
      SELECT slug, from_date, to_date, entries, generated_by, generated_at
      FROM prodete_reports
      WHERE slug = $1
    `, [slug])

    if (result.rows.length === 0) return null

    const row = result.rows[0]

    return {
      slug         : row.slug,
      from_date    : row.from_date,
      to_date      : row.to_date,
      from_ts      : parse_date_wib_start(row.from_date),
      to_ts        : parse_date_wib_start(row.to_date) + 86400 * 1000 - 1,
      entries      : typeof row.entries === "string" ? JSON.parse(row.entries) : row.entries,
      generated_by : row.generated_by,
      generated_at : Number(row.generated_at),
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
