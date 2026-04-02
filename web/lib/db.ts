import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export { pool }

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

/**
 * @description Fetch a tempvoice transcript by ID.
 * @param transcript_id - UUID of the transcript
 * @returns Parsed transcript data or null
 */
export async function get_tempvoice_transcript(transcript_id: string) {
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT * FROM tempvoice_transcripts WHERE transcript_id = $1',
      [transcript_id]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      transcript_id    : row.transcript_id,
      channel_id       : row.channel_id,
      channel_name     : row.channel_name,
      owner_id         : row.owner_id,
      owner_tag        : row.owner_tag,
      guild_id         : row.guild_id,
      messages         : typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages,
      created_at       : parseInt(row.created_at),
      deleted_at       : parseInt(row.deleted_at),
      duration_seconds : parseInt(row.duration_seconds),
      total_visitors   : parseInt(row.total_visitors),
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
 * @param guild_id - Discord guild ID
 * @returns Number of deleted rows
 */
export async function delete_bypass_logs(guild_id: string): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      'DELETE FROM bypass_logs WHERE guild_id = $1',
      [guild_id]
    )
    return result.rowCount ?? 0
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

export async function get_dashboard_stats() {
  const client = await pool.connect()
  try {
    const salaries_result = await client.query('SELECT SUM(total_salary) as total FROM work_reports')
    const total_salaries = Number(salaries_result.rows[0]?.total ?? 0)
    const earnings_result = await client.query('SELECT SUM(amount) as total FROM work_logs')
    const total_earnings = Number(earnings_result.rows[0]?.total ?? 0)
    const work_logs_result = await client.query('SELECT COUNT(*) as total FROM work_logs')
    const total_work_logs = Number(work_logs_result.rows[0]?.total ?? 0)
    const transcripts_result = await client.query('SELECT COUNT(*) as total FROM ticket_transcripts')
    const total_transcripts = Number(transcripts_result.rows[0]?.total ?? 0)
    return { total_salaries, total_earnings, total_work_logs, total_transcripts }
  } catch (error) {
    return { total_salaries: 0, total_earnings: 0, total_work_logs: 0, total_transcripts: 0 }
  } finally {
    client.release()
  }
}

export async function get_chart_data() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT TO_CHAR(to_timestamp(created_at::numeric), 'Mon') as month,
             date_trunc('month', to_timestamp(created_at::numeric)) as sort_date,
             COUNT(CASE WHEN type = 'ticket' THEN 1 END)::int as tickets,
             COUNT(CASE WHEN type = 'whitelist' THEN 1 END)::int as whitelists
      FROM work_logs
      GROUP BY TO_CHAR(to_timestamp(created_at::numeric), 'Mon'), date_trunc('month', to_timestamp(created_at::numeric))
      ORDER BY date_trunc('month', to_timestamp(created_at::numeric)) ASC
      LIMIT 12
    `)
    
    // As salaries (jumlah payout) is much smaller than ticket count,
    // let's fetch it from work_reports separately so we can merge it.
    const salaryResult = await client.query(`
      SELECT TO_CHAR(to_timestamp(last_work::numeric), 'Mon') as month,
             COUNT(*)::int as salaries
      FROM work_reports
      GROUP BY TO_CHAR(to_timestamp(last_work::numeric), 'Mon')
    `)
    
    const salaryMap: Record<string, number> = {};
    salaryResult.rows.forEach(r => {
      salaryMap[r.month] = Number(r.salaries || 0);
    });

    return result.rows.map((row) => ({
      month: row.month,
      tickets: Number(row.tickets || 0),
      whitelists: Number(row.whitelists || 0),
      salaries: salaryMap[row.month] || 0
    }))
  } catch (error) {
    return []
  } finally {
    client.release()
  }
}

export async function get_top_staff() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT staff_name, SUM(amount::numeric) as total_earnings, COUNT(id) as total_jobs
      FROM work_logs
      GROUP BY staff_name
      ORDER BY total_earnings DESC
      LIMIT 5
    `)
    return result.rows.map(r => ({
      ...r,
      total_earnings: Number(r.total_earnings || 0),
      total_jobs: Number(r.total_jobs || 0)
    }))
  } catch (error) {
    return []
  } finally {
    client.release()
  }
}

export interface WorkLogRow {
  id: number
  work_id: string
  staff_id: string
  staff_name: string
  type: "ticket" | "whitelist"
  thread_link: string
  proof_link: string | null
  amount: string
  salary: string
  week_number: number
  year: number
  date: string
  created_at: string
}

export async function get_recent_work_logs(limit: number = 8): Promise<WorkLogRow[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT *
      FROM work_logs
      ORDER BY created_at::numeric DESC
      LIMIT $1
    `, [limit])
    return result.rows || []
  } catch (error) {
    console.error("Error fetching work logs:", error)
    return []
  } finally {
    client.release()
  }
}
