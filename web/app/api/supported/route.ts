import { NextRequest, NextResponse } from 'next/server'

const __bypass_api_key = process.env.BYPASS_API_KEY || ""
const __bypass_api_url = process.env.BYPASS_API_URL || ""

// - 5-MINUTE CACHE TO AVOID HAMMERING THE UPSTREAM API - \\
let __cache: { data: unknown; expires_at: number } | null = null
const __cache_ttl_ms = 5 * 60 * 1000

/**
 * @route GET /api/supported
 * @description Returns supported bypass services. Cached for 5 minutes.
 */
export async function GET(req: NextRequest) {
  try {
    // - SAME-ORIGIN CHECK - \\
    const origin  = req.headers.get("origin")
    const referer = req.headers.get("referer")
    const host    = req.headers.get("host") || ""

    const origin_ok  = origin  ? origin.replace(/^https?:\/\//, "").startsWith(host)  : false
    const referer_ok = referer ? referer.replace(/^https?:\/\//, "").startsWith(host) : false

    if (host && !origin_ok && !referer_ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!__bypass_api_key || !__bypass_api_url) {
      return NextResponse.json({ error: "Bypass service is not configured." }, { status: 503 })
    }

    // - RETURN FROM CACHE IF STILL VALID - \\
    if (__cache && Date.now() < __cache.expires_at) {
      return NextResponse.json(__cache.data, {
        headers: { "X-Cache": "HIT" },
      })
    }

    const supported_url  = __bypass_api_url.replace("/bypass", "/supported")
    const controller     = new AbortController()
    const timeout_id     = setTimeout(() => controller.abort(), 10_000)

    let res: Response

    try {
      res = await fetch(supported_url, {
        method  : "GET",
        headers : {
          "x-api-key"       : __bypass_api_key,
          "Accept-Encoding" : "gzip, deflate, br",
          "Connection"      : "keep-alive",
        },
        signal: controller.signal,
      })
    } catch (err: any) {
      clearTimeout(timeout_id)
      console.error("[ - SUPPORTED API - ] Fetch error:", err)
      return NextResponse.json(
        { error: err?.name === "AbortError" ? "Request timed out." : "Failed to reach service." },
        { status: 503 }
      )
    }

    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - SUPPORTED API - ] Non-OK response: ${res.status}`)
      return NextResponse.json({ error: "Upstream error." }, { status: 502 })
    }

    const raw  = await res.json().catch(() => null)
    const data = raw?.result ?? raw ?? []

    // - STORE IN CACHE - \\
    __cache = { data, expires_at: Date.now() + __cache_ttl_ms }

    console.log(`[ - SUPPORTED API - ] Fetched ${Array.isArray(data) ? data.length : '?'} services`)
    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    })
  } catch (error) {
    console.error("[ - SUPPORTED API - ] Unhandled error:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
