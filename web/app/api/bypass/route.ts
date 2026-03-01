import { NextRequest, NextResponse }    from 'next/server'
import { increment_bypass_count }       from '@/lib/db'

const __bypass_api_key     = process.env.BYPASS_API_KEY    || ""
const __bypass_api_url     = process.env.BYPASS_API_URL    || ""
const __bypass_refresh_url = __bypass_api_url.replace("/bypass", "/refresh")
const __refresh_interval   = 2_000  // - Poll /v1/refresh every 2s while TASK_ALREADY_PROCESSING - \\
const __refresh_max_wait   = 55_000 // - Stop polling after 55s total - \\

// - IN-MEMORY RATE LIMITER (per IP, 5 req/min) - \\
const __rate_map    = new Map<string, { count: number; reset_at: number }>()
const __rate_limit  = 5
const __rate_window = 60_000

/**
 * @param ip - Client IP address
 * @returns Whether the request is allowed and optional retry_after seconds
 */
function __check_rate_limit(ip: string): { allowed: boolean; retry_after?: number } {
  const now   = Date.now()
  const entry = __rate_map.get(ip)

  if (!entry || now > entry.reset_at) {
    __rate_map.set(ip, { count: 1, reset_at: now + __rate_window })
    return { allowed: true }
  }

  if (entry.count >= __rate_limit) {
    return { allowed: false, retry_after: Math.ceil((entry.reset_at - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

/**
 * @param req - Incoming Next.js request
 * @returns Best-guess client IP string
 */
function __get_client_ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip")                             ||
    "unknown"
  )
}

/**
 * @route POST /api/bypass
 * @description Server-side bypass endpoint. Keeps BYPASS_API_KEY secret.
 *              Restricted to same-origin requests only.
 * @param req - NextRequest with JSON body { url: string }
 * @returns JSON { success, result } or { error }
 */
export async function POST(req: NextRequest) {
  try {
    // - ENFORCE SAME-ORIGIN - \\
    const origin  = req.headers.get("origin")
    const referer = req.headers.get("referer")
    const host    = req.headers.get("host") || ""

    const origin_ok  = origin  ? origin.replace(/^https?:\/\//, "").startsWith(host) : false
    const referer_ok = referer ? referer.replace(/^https?:\/\//, "").startsWith(host) : false

    if (host && !origin_ok && !referer_ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // - RATE LIMITING - \\
    const ip    = __get_client_ip(req)
    const limit = __check_rate_limit(ip)

    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limit.retry_after}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retry_after) } }
      )
    }

    // - VALIDATE INPUT - \\
    const body = await req.json().catch(() => null)

    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 })
    }

    const url = body.url.trim()

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 })
    }

    if (!__bypass_api_key || !__bypass_api_url) {
      console.error("[ - BYPASS API - ] Missing BYPASS_API_KEY or BYPASS_API_URL")
      return NextResponse.json({ error: "Bypass service is not configured." }, { status: 503 })
    }

    // - INCREMENT COUNT PER ATTEMPT (BEFORE FETCH) - \\
    increment_bypass_count().catch(err => console.error('[ - BYPASS STATS - ] Failed to increment count:', err))

    // - CALL BYPASS API SERVER-SIDE (KEY NEVER EXPOSED TO CLIENT) - \\
    const params         = new URLSearchParams({ url })
    const headers        = {
      "x-api-key"       : __bypass_api_key,
      "Accept-Encoding" : "gzip, deflate, br",
      "Connection"      : "keep-alive",
    }
    const __request_start = Date.now()

    // - HELPER: PLAIN FETCH, NO ABORT — LET THE SERVER RESPOND IN ITS OWN TIME - \\
    const timed_fetch = (fetch_url: string): Promise<Response> =>
      fetch(`${fetch_url}?${params}`, { method: "GET", headers })

    let res: Response
    try {
      res = await timed_fetch(__bypass_api_url)
    } catch (err: any) {
      console.error("[ - BYPASS API - ] Fetch error:", err)
      return NextResponse.json(
        { error: "Failed to reach bypass service." },
        { status: 503 }
      )
    }

    // - PARSE INITIAL RESPONSE - \\
    const initial_text = await res.text().catch(() => "")
    let   initial_data: any = {}
    try { initial_data = JSON.parse(initial_text) } catch { initial_data = { message: initial_text } }

    const is_processing = (
      res.status === 429 && initial_data?.code === "TASK_ALREADY_PROCESSING"
    ) || initial_data?.code === "TASK_ALREADY_PROCESSING"

    // - SUCCESS ON FIRST TRY - \\
    if (res.ok && initial_data?.result) {
      console.log(`[ - BYPASS API - ] Success (first try) for: ${url}`)
      return NextResponse.json({ success: true, result: initial_data.result, elapsed_ms: Date.now() - __request_start })
    }

    // - TASK QUEUED ON SERVER: POLL /v1/refresh EVERY 2s UNTIL READY - \\
    if (is_processing) {
      console.log(`[ - BYPASS API - ] Task processing, polling /v1/refresh for: ${url}`)
      const poll_deadline = Date.now() + __refresh_max_wait

      while (Date.now() < poll_deadline) {
        await new Promise(r => setTimeout(r, __refresh_interval))

        try {
          const poll_res = await timed_fetch(__bypass_refresh_url)
          if (poll_res.ok) {
            const poll_data = await poll_res.json().catch(() => null)
            if (poll_data?.result) {
              console.log(`[ - BYPASS API - ] Refresh hit for: ${url} in ${Date.now() - __request_start}ms`)
              return NextResponse.json({ success: true, result: poll_data.result, elapsed_ms: Date.now() - __request_start })
            }
          }
        } catch {
          // - ignore polling errors, keep waiting - \\
        }
      }

      return NextResponse.json({ error: "Bypass timed out. Please try again." }, { status: 504 })
    }

    if (res.status === 429) {
      const retry_after = res.headers.get("retry-after") || "60"
      return NextResponse.json(
        { error: `Bypass service is rate limited. Try again in ${retry_after}s.` },
        { status: 429 }
      )
    }

    if (!res.ok) {
      console.error(`[ - BYPASS API - ] Non-OK response ${res.status}:`, initial_text)
      return NextResponse.json({ error: "Bypass service returned an error." }, { status: 502 })
    }

    if (!initial_data?.result) {
      return NextResponse.json(
        { error: initial_data?.message || "No result returned from bypass service." },
        { status: 502 }
      )
    }

    console.log(`[ - BYPASS API - ] Success for: ${url}`)
    return NextResponse.json({ success: true, result: initial_data.result, elapsed_ms: Date.now() - __request_start })

  } catch (error) {
    console.error("[ - BYPASS API - ] Unhandled error:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

// - DISALLOW ALL OTHER METHODS - \\
export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 })
}
