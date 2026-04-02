import { NextResponse } from 'next/server'
import { pool }         from '@/lib/db'

// - bot Express 服务器 URL - \\
// - bot Express server URL - \\
const __bot_url = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'

export interface bot_stats_payload {
  // - bot status - \\
  status      : 'alive' | 'starting' | 'offline'
  bot_ready   : boolean
  // - latency - \\
  ws_ping     : number
  api_latency : number
  db_latency  : number
  // - memory - \\
  memory      : {
    rss_mb        : number
    heap_used_mb  : number
    heap_total_mb : number
    external_mb   : number
  }
  // - uptime - \\
  uptime         : number
  uptime_formatted: string
  // - timestamps - \\
  timestamp      : number
  sampled_at     : number
}

/**
 * @description formats uptime seconds into a human-readable string
 * @param {number} seconds - uptime in seconds
 * @returns {string} formatted uptime
 */
function format_uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * @description measures DB latency by running a simple SELECT 1
 * @returns {Promise<number>} latency in ms, or -1 if unavailable
 */
async function measure_db_latency(): Promise<number> {
  try {
    const client = await pool.connect()
    try {
      const start     = Date.now()
      await client.query('SELECT 1')
      return Date.now() - start
    } finally {
      client.release()
    }
  } catch {
    return -1
  }
}

/**
 * @route GET /api/bot-stats
 * @description Returns combined bot + DB stats snapshot.
 * @returns {bot_stats_payload}
 */
export async function GET() {
  const fetch_start = Date.now()

  const [db_latency_result, bot_response] = await Promise.allSettled([
    measure_db_latency(),
    fetch(`${__bot_url}/api/bot-stats`, {
      signal: AbortSignal.timeout(8000),
      next  : { revalidate: 0 },
    }),
  ])

  const api_latency = Date.now() - fetch_start
  const db_latency  = db_latency_result.status === 'fulfilled' ? db_latency_result.value : -1

  // - bot unreachable - \\
  if (bot_response.status === 'rejected' || !bot_response.value.ok) {
    const payload: bot_stats_payload = {
      status          : 'offline',
      bot_ready       : false,
      ws_ping         : -1,
      api_latency,
      db_latency,
      memory          : { rss_mb: 0, heap_used_mb: 0, heap_total_mb: 0, external_mb: 0 },
      uptime          : 0,
      uptime_formatted: '—',
      timestamp       : Date.now(),
      sampled_at      : Date.now(),
    }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  }

  const raw = await bot_response.value.json()

  const payload: bot_stats_payload = {
    status          : raw.status ?? 'offline',
    bot_ready       : raw.bot_ready ?? false,
    ws_ping         : raw.ws_ping ?? -1,
    api_latency,
    db_latency,
    memory          : raw.memory ?? { rss_mb: 0, heap_used_mb: 0, heap_total_mb: 0, external_mb: 0 },
    uptime          : raw.uptime ?? 0,
    uptime_formatted: format_uptime(raw.uptime ?? 0),
    timestamp       : raw.timestamp ?? Date.now(),
    sampled_at      : Date.now(),
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
