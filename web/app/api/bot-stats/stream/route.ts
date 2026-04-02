import { pool } from '@/lib/db'

// - bot Express 服务器 URL - \\
// - bot Express server URL - \\
const __bot_url      = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __interval_ms  = 3000

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// - 格式化运行时间 - \\
// - format uptime seconds into readable string - \\
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

// - 测量数据库延迟 - \\
// - measure DB latency via a simple SELECT 1 - \\
async function measure_db_latency(): Promise<number> {
  try {
    const client = await pool.connect()
    try {
      const start = Date.now()
      await client.query('SELECT 1')
      return Date.now() - start
    } finally {
      client.release()
    }
  } catch {
    return -1
  }
}

// - 拉取机器人当前统计快照 - \\
// - fetch current bot stats snapshot - \\
async function fetch_snapshot(): Promise<object> {
  const fetch_start = Date.now()

  const [db_result, bot_result] = await Promise.allSettled([
    measure_db_latency(),
    fetch(`${__bot_url}/api/bot-stats`, {
      signal: AbortSignal.timeout(6000),
    }),
  ])

  const api_latency = Date.now() - fetch_start
  const db_latency  = db_result.status === 'fulfilled' ? db_result.value : -1

  if (bot_result.status === 'rejected' || !bot_result.value.ok) {
    return {
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
  }

  const raw = await bot_result.value.json()
  return {
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
}

/**
 * @route GET /api/bot-stats/stream
 * @description Server-Sent Events stream — pushes a bot stats snapshot every 3 seconds.
 * @returns text/event-stream
 */
export async function GET() {
  const encoder = new TextEncoder()
  let interval_id: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      // - 立即推送第一条数据 - \\
      // - push first event immediately - \\
      const push = async () => {
        try {
          const data = await fetch_snapshot()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // - 忽略推送失败，等待下一轮 - \\
          // - ignore push error, wait for next tick - \\
        }
      }

      await push()
      interval_id = setInterval(push, __interval_ms)
    },
    cancel() {
      // - 客户端断开时清理定时器 - \\
      // - cleanup interval when client disconnects - \\
      if (interval_id !== null) clearInterval(interval_id)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type'      : 'text/event-stream',
      'Cache-Control'     : 'no-cache, no-transform',
      'Connection'        : 'keep-alive',
      'X-Accel-Buffering' : 'no',
    },
  })
}
