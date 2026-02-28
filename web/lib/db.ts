import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/**
 * Returns total bypassed link count.
 * @returns Total count as number
 */
export async function get_bypass_count(): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT total_count FROM bypass_stats LIMIT 1')
    return Number(result.rows[0]?.total_count ?? 87000)
  } finally {
    client.release()
  }
}

/**
 * Increments total bypassed link count by 1.
 * @returns Updated total count
 */
export async function increment_bypass_count(): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      UPDATE bypass_stats
      SET total_count = total_count + 1, updated_at = NOW()
      RETURNING total_count
    `)
    return Number(result.rows[0]?.total_count ?? 87000)
  } finally {
    client.release()
  }
}

export async function get_transcript(transcript_id: string) {
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT * FROM ticket_transcripts WHERE transcript_id = $1',
      [transcript_id]
    )
    
    if (result.rows.length === 0) return null
    
    const row = result.rows[0]
    return {
      transcript_id: row.transcript_id,
      ticket_id: row.ticket_id,
      ticket_type: row.ticket_type,
      thread_id: row.thread_id,
      owner_id: row.owner_id,
      owner_tag: row.owner_tag,
      claimed_by: row.claimed_by,
      closed_by: row.closed_by,
      issue_type: row.issue_type,
      description: row.description,
      messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages,
      open_time: parseInt(row.open_time),
      close_time: parseInt(row.close_time),
    }
  } finally {
    client.release()
  }
}

// - BYPASS GUILD SETTINGS - \\

export interface bypass_guild_settings {
  bypass_channel         ?: string
  bypass_enabled         ?: string   // "true" | "false" | undefined
  bypass_disabled_reason ?: string
  bypass_roles           ?: string[] // allowed role IDs; empty = everyone
}

/**
 * @param guild_id - Discord guild ID
 * @returns Bypass-related settings or null
 */
export async function get_bypass_guild_settings(guild_id: string): Promise<bypass_guild_settings | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT settings FROM guild_settings WHERE guild_id = $1`,
      [guild_id]
    )
    if (result.rows.length === 0) return null
    const settings = result.rows[0].settings ?? {}
    return {
      bypass_channel         : settings.bypass_channel         ?? null,
      bypass_enabled         : settings.bypass_enabled         ?? null,
      bypass_disabled_reason : settings.bypass_disabled_reason ?? null,
      bypass_roles           : settings.bypass_roles           ?? [],
    }
  } finally {
    client.release()
  }
}

/**
 * @param guild_id - Discord guild ID
 * @param patch    - Partial settings to merge in
 * @returns Success
 */
export async function set_bypass_guild_settings(guild_id: string, patch: bypass_guild_settings): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query(`
      INSERT INTO guild_settings (guild_id, settings, created_at, updated_at)
      VALUES ($1, $2::jsonb, NOW(), NOW())
      ON CONFLICT (guild_id) DO UPDATE
        SET settings   = guild_settings.settings || $2::jsonb,
            updated_at = NOW()
    `, [guild_id, JSON.stringify(patch)])
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * @param guild_id      - Discord guild ID
 * @param setting_key   - Key to remove from settings JSONB
 * @returns Success
 */
export interface bypass_guild_stat_row {
  date  : string
  count : number
}

/**
 * @param guild_id - Discord guild ID
 * @param days     - How many past days to return (default 14)
 * @returns Daily bypass counts for this guild
 */
export async function get_bypass_guild_stats(
  guild_id : string,
  days     = 14
): Promise<bypass_guild_stat_row[]> {
  const client = await pool.connect()
  try {
    const result = await client.query<{ date: string; count: string }>(
      `SELECT date::text, count
       FROM bypass_guild_stats
       WHERE guild_id = $1
         AND date >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
       ORDER BY date ASC`,
      [guild_id, days]
    )
    return result.rows.map(r => ({ date: r.date.slice(0, 10), count: Number(r.count) }))
  } finally {
    client.release()
  }
}

/**
 * @param guild_id - Discord guild ID
 * @returns Total bypass count for this guild (all time)
 */
export async function get_bypass_guild_total(guild_id: string): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(count), 0)::text AS total FROM bypass_guild_stats WHERE guild_id = $1`,
      [guild_id]
    )
    return Number(result.rows[0]?.total ?? 0)
  } finally {
    client.release()
  }
}

export async function remove_bypass_guild_setting(guild_id: string, setting_key: string): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query(`
      UPDATE guild_settings
      SET settings   = settings - $2,
          updated_at = NOW()
      WHERE guild_id = $1
    `, [guild_id, setting_key])
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

// - BYPASS LOGS - \\

export interface bypass_log_row {
  id         : number
  guild_id   : string
  user_id    : string
  user_tag   : string
  avatar     : string | null
  url        : string
  result_url : string | null
  success    : boolean
  created_at : string
}

/**
 * @param guild_id - Guild ID to fetch logs for
 * @param limit    - Max rows to return (default 50)
 * @param offset   - Pagination offset (default 0)
 * @returns Array of bypass log rows
 */
export async function get_bypass_logs(
  guild_id  : string,
  limit     = 50,
  offset    = 0
): Promise<bypass_log_row[]> {
  const client = await pool.connect()
  try {
    const result = await client.query<bypass_log_row>(
      `SELECT id, guild_id, user_id, user_tag, avatar, url, result_url, success, created_at
       FROM bypass_logs
       WHERE guild_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [guild_id, limit, offset]
    )
    return result.rows
  } finally {
    client.release()
  }
}

/**
 * @param guild_id - Guild ID to count logs for
 * @returns Total log count
 */
export async function count_bypass_logs(guild_id: string): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM bypass_logs WHERE guild_id = $1',
      [guild_id]
    )
    return parseInt(result.rows[0]?.total ?? '0', 10)
  } finally {
    client.release()
  }
}

/**
 * @param entry - Bypass log entry to insert
 * @returns Success
 */
export async function insert_bypass_log(entry: Omit<bypass_log_row, 'id' | 'created_at'>): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO bypass_logs (guild_id, user_id, user_tag, avatar, url, result_url, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [entry.guild_id, entry.user_id, entry.user_tag, entry.avatar, entry.url, entry.result_url, entry.success]
    )
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * @returns Pool instance for direct queries
 */
export function get_pool(): Pool {
  return pool
}
