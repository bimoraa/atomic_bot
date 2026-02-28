// - BYPASS LINK SERVICE - \\

import { get_pool } from "@shared/utils/database"

const __bypass_api_key     = process.env.BYPASS_API_KEY || ""
const __bypass_api_url     = process.env.BYPASS_API_URL || ""
const __bypass_refresh_url = process.env.BYPASS_API_URL?.replace("/bypass", "/refresh") || ""

const __bypass_global_timeout  = 120000  // - Safety net — 2 min max total wait - \\
export const bypass_max_retry  = 3
const __bypass_max_retry       = bypass_max_retry
const __bypass_retry_ms        = 5000    // - Wait before each retry - \\
const __bypass_default_backoff = 15      // - Default backoff seconds on 429 - \\
const __refresh_interval_ms    = 2000    // - Poll /v1/refresh every 2s - \\
const __refresh_max_wait_ms    = 55000   // - Max polling window for processing tasks - \\

// - URL-BASED RESULT CACHE TTL - \\
const __url_cache_ttl_minutes = 30

/**
 * Builds a stable cache key from a URL.
 * @param url - The URL to hash
 * @returns Cache key string
 */
function __url_cache_key(url: string): string {
  return `bypass_url_cache_${Buffer.from(url.trim()).toString('base64').replace(/[+/=]/g, '').slice(0, 64)}`
}

/**
 * Checks bypass_cache table for a previously bypassed result for this URL.
 * @param url - The URL to look up
 * @returns Cached result string or null
 */
async function __get_url_cache(url: string): Promise<string | null> {
  try {
    const row = await get_pool().query<{ url: string }>(
      `SELECT url FROM bypass_cache WHERE key = $1 AND expires_at > NOW() LIMIT 1`,
      [__url_cache_key(url)]
    )
    return row.rows[0]?.url ?? null
  } catch {
    return null
  }
}

/**
 * Stores a bypass result in cache keyed by URL.
 * @param url    - The original URL
 * @param result - The bypassed result to cache
 */
async function __set_url_cache(url: string, result: string): Promise<void> {
  try {
    await get_pool().query(
      `INSERT INTO bypass_cache (key, url, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${__url_cache_ttl_minutes} minutes')
       ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '${__url_cache_ttl_minutes} minutes'`,
      [__url_cache_key(url), result]
    )
  } catch (err) {
    console.error(`[ - BYPASS CACHE - ] Failed to store URL cache:`, err)
  }
}

// - SLIDING WINDOW REQUEST TRACKER - \\
const __request_timestamps: number[] = []
const __track_window_ms = 10_000

function __record_request(): void {
  const now = Date.now()
  __request_timestamps.push(now)
  // - PRUNE ENTRIES OUTSIDE THE WINDOW - \\
  const cutoff = now - __track_window_ms
  while (__request_timestamps.length > 0 && __request_timestamps[0] < cutoff) {
    __request_timestamps.shift()
  }
}

/**
 * Returns current API request rate stats for the last 10 seconds.
 * @returns Object with count in window and timestamps array copy
 */
export function get_request_stats(): { requests_last_10s: number; timestamps: number[] } {
  const now = Date.now()
  const cutoff = now - __track_window_ms
  const recent = __request_timestamps.filter(t => t >= cutoff)
  return {
    requests_last_10s: recent.length,
    timestamps: [...recent],
  }
}

// - GLOBAL BACKOFF: pause entire queue when rate limited - \\
let __backoff_until: number = 0

function __set_global_backoff(seconds: number): void {
  const until = Date.now() + seconds * 1000
  if (until > __backoff_until) {
    __backoff_until = until
    const { requests_last_10s } = get_request_stats()
    console.warn(`[ - BYPASS - ] Global backoff set for ${seconds}s until ${new Date(until).toISOString()} (requests last 10s: ${requests_last_10s})`)
  }
}

/** Returns remaining global backoff in ms (0 if not active). */
function __get_backoff_remaining_ms(): number {
  return Math.max(0, __backoff_until - Date.now())
}

// - GLOBAL RATE LIMIT QUEUE - \\
let __bypass_queue: Promise<void> = Promise.resolve()
let __queue_length = 0

async function __enqueue_bypass<T>(task: () => Promise<T>): Promise<T> {
  __queue_length++
  console.warn(`[ - BYPASS - ] Enqueuing request. Queue length: ${__queue_length}`)
  const current = __bypass_queue
  let resolve_next!: () => void
  __bypass_queue = new Promise(resolve => {
    resolve_next = resolve
  })

  await current

  // - HONOUR GLOBAL BACKOFF BEFORE FIRING THE NEXT REQUEST - \\
  const backoff_wait = __backoff_until - Date.now()
  if (backoff_wait > 0) {
    console.warn(`[ - BYPASS - ] Respecting global backoff, waiting ${backoff_wait}ms...`)
    await new Promise(resolve => setTimeout(resolve, backoff_wait))
  }

  try {
    __record_request()
    console.warn(`[ - BYPASS - ] Executing task from queue. Queue length: ${__queue_length}`)
    return await task()
  } finally {
    __queue_length--
    console.warn(`[ - BYPASS - ] Task finished. Resolving next. Queue length: ${__queue_length}`)
    resolve_next()
  }
}

interface BypassResponse {
  success: boolean
  result?: string
  error?: string
  time?: number
  attempts?: number
  is_client_error?: boolean
  retry_after?: number
  api_code?: string
}

interface SupportedService {
  name: string
  type: string
  status: string
  domains: string[]
}

/**
 * @param url     - The URL to bypass
 * @param attempt - Current attempt number (internal, starts at 1)
 * @returns Promise with bypass result
 */
async function bypass_link_once(url: string, attempt: number): Promise<BypassResponse> {
  const trimmed_url = url.trim()
  console.warn(`[ - BYPASS - ] Starting attempt ${attempt} for URL: ${trimmed_url}`)

  // - CHECK URL CACHE FIRST (ONLY ON FIRST ATTEMPT) - \\
  if (attempt === 1) {
    const cached = await __get_url_cache(trimmed_url)
    if (cached) {
      console.warn(`[ - BYPASS - ] Cache hit for URL: ${trimmed_url}`)
      return { success: true, result: cached, time: 0, attempts: 0 }
    }
  }

  try {
    const start_time  = Date.now()
    const params      = new URLSearchParams({ url: trimmed_url })
    const req_headers = {
      "x-api-key"       : __bypass_api_key,
      "Accept-Encoding" : "gzip, deflate, br",
      "Connection"      : "keep-alive",
    }

    // - HELPER: SINGLE TIMED FETCH - \\
    const timed_fetch = async (endpoint: string): Promise<Response> => {
      const ctrl       = new AbortController()
      const timeout_id = setTimeout(() => ctrl.abort(), 30000)
      try {
        return await fetch(`${endpoint}?${params}`, { method: "GET", headers: req_headers, signal: ctrl.signal })
      } finally {
        clearTimeout(timeout_id)
      }
    }

    const response = await __enqueue_bypass(() => {
      console.warn(`[ - BYPASS - ] Requesting: ${__bypass_api_url}?${params}`)
      return timed_fetch(__bypass_api_url).catch(err => {
        console.error(`[ - BYPASS - ] Fetch threw an error for attempt ${attempt}:`, err)
        throw err
      })
    })

    console.warn(`[ - BYPASS - ] Response status for attempt ${attempt}: ${response.status} ${response.statusText}`)

    const resp_text = await response.text().catch(() => "")
    let   resp_data: any = {}
    try { resp_data = JSON.parse(resp_text) } catch { resp_data = { message: resp_text } }

    // - TASK QUEUED ON SERVER: POLL /v1/refresh UNTIL RESULT READY - \\
    const is_processing = (
      response.status === 429 && resp_data?.code === "TASK_ALREADY_PROCESSING"
    ) || resp_data?.code === "TASK_ALREADY_PROCESSING"

    if (is_processing) {
      console.warn(`[ - BYPASS - ] Task already processing for attempt ${attempt}, polling /v1/refresh...`)
      const poll_deadline = Date.now() + __refresh_max_wait_ms

      while (Date.now() < poll_deadline) {
        await new Promise(r => setTimeout(r, __refresh_interval_ms))

        try {
          const poll_res  = await timed_fetch(__bypass_refresh_url)
          const poll_text = await poll_res.text().catch(() => "")
          let   poll_data: any = {}
          try { poll_data = JSON.parse(poll_text) } catch { /* ignore */ }

          if (poll_res.ok && poll_data?.result) {
            const elapsed = ((Date.now() - start_time) / 1000).toFixed(2)
            console.warn(`[ - BYPASS - ] Refresh hit for attempt ${attempt} in ${elapsed}s`)
            __set_url_cache(trimmed_url, poll_data.result).catch(() => {})
            return { success: true, result: poll_data.result, time: parseFloat(elapsed), attempts: attempt }
          }
        } catch (poll_err) {
          console.warn(`[ - BYPASS - ] Refresh poll error:`, poll_err)
        }
      }

      return { success: false, error: "Bypass timed out waiting for result.", attempts: attempt }
    }

    if (!response.ok) {
      const err_message = resp_data.message || resp_data.result || `HTTP ${response.status}`
      const err         = new Error(err_message)
        ; (err as any).status   = response.status
        ; (err as any).api_code = resp_data.code || ""

      const retry_after = response.headers.get("retry-after") || response.headers.get("Retry-After")
      if (retry_after) (err as any).retry_after = parseInt(retry_after, 10)

      throw err
    }

    const process_time = ((Date.now() - start_time) / 1000).toFixed(2)
    console.warn(`[ - BYPASS - ] Response data for attempt ${attempt}:`, JSON.stringify(resp_data).substring(0, 500))

    if (resp_data?.result) {
      console.warn(`[ - BYPASS - ] Success on attempt ${attempt} in ${process_time}s`)
      __set_url_cache(trimmed_url, resp_data.result).catch(() => {})
      return { success: true, result: resp_data.result, time: parseFloat(process_time), attempts: attempt }
    }

    return { success: false, error: resp_data?.message || "No result found in response", attempts: attempt }

  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : ""
    const name = typeof error?.name === "string" ? error.name : ""

    // - LOG AS WARN FOR EXPECTED API ERRORS TO REDUCE NOISE - \\
    if (message.includes("HTTP 5")) {
      console.warn(`[ - BYPASS - ] External API Error (attempt ${attempt}):`, message)
    } else if (message.includes("HTTP 429") || error?.status === 429) {
      // - TRIGGER GLOBAL BACKOFF SO NO MORE QUEUED REQUESTS FIRE - \\
      const backoff_s = (error?.retry_after && !isNaN(error.retry_after))
        ? Math.max(error.retry_after, __bypass_default_backoff)
        : __bypass_default_backoff
      __set_global_backoff(backoff_s)
      console.warn(`[ - BYPASS - ] Rate Limit (attempt ${attempt}):`, message)
    } else {
      console.error(`[ - BYPASS - ] Error (attempt ${attempt}):`, message || error)
    }

    let error_message = "Unknown error occurred"

    if (name === "AbortError" || message.includes("aborted")) {
      error_message = "Request timeout - Please try again later."
    } else if (message.includes("not supported") || message.includes("unsupported")) {
      error_message = "Link is not supported."
    } else if (message.includes("429")) {
      error_message = "Rate limit exceeded - Please wait a moment."
    } else if (message.includes("5")) {
      error_message = "Service unavailable - Please try again later."
    } else if (message) {
      error_message = message
    }

    const status = error?.status
    const is_client_error = status >= 400 && status < 500 && status !== 429

    return {
      success        : false,
      error          : error_message,
      attempts       : attempt,
      is_client_error,
      retry_after    : error?.retry_after,
      api_code       : error?.api_code || "",
    }
  }
}

/**
 * @param url      - The URL to bypass
 * @param on_retry - Optional callback fired before each retry with attempt number and estimated total wait ms
 * @returns Promise with bypass result
 */
export async function bypass_link(
  url: string,
  on_retry?: (attempt: number, wait_ms: number, is_processing: boolean) => void | Promise<void>
): Promise<BypassResponse> {
  console.warn(`[ - BYPASS - ] Starting bypass_link for URL: ${url}`)
  // - RACE AGAINST GLOBAL TIMEOUT TO PREVENT STUCK LOADING STATE - \\
  let global_timeout_id!: ReturnType<typeof setTimeout>
  const timeout_promise = new Promise<BypassResponse>(resolve => {
    global_timeout_id = setTimeout(() => {
      console.warn(`[ - BYPASS - ] Global timeout (${__bypass_global_timeout}ms) hit for URL: ${url}`)
      resolve({ success: false, error: "Request timed out - Please try again later.", attempts: 0 })
    }, __bypass_global_timeout)
  })

  const result = await Promise.race([timeout_promise, _run_bypass_link(url, on_retry)])
  clearTimeout(global_timeout_id)
  console.warn(`[ - BYPASS - ] bypass_link finished for URL: ${url} with success: ${result.success}`)
  return result
}

async function _run_bypass_link(
  url: string,
  on_retry?: (attempt: number, wait_ms: number, is_processing: boolean) => void | Promise<void>
): Promise<BypassResponse> {
  let last_result: BypassResponse = { success: false, error: "Unknown error", attempts: 0 }

  for (let attempt = 1; attempt <= __bypass_max_retry; attempt++) {
    console.warn(`[ - BYPASS - ] _run_bypass_link loop starting attempt ${attempt} for URL: ${url}`)
    last_result = await bypass_link_once(url, attempt)
    console.warn(`[ - BYPASS - ] _run_bypass_link loop finished attempt ${attempt} for URL: ${url} with success: ${last_result.success}`)

    if (last_result.success) return last_result

    // - DON'T RETRY ON UNSUPPORTED LINKS OR CLIENT ERRORS - NO POINT - \\
    const is_unsupported = last_result.error?.toLowerCase().includes("not supported")
      || last_result.error?.toLowerCase().includes("unsupported")
    if (is_unsupported || last_result.is_client_error) {
      console.warn(`[ - BYPASS - ] _run_bypass_link aborting retries for URL: ${url} (unsupported or client error)`)
      return last_result
    }

    if (attempt < __bypass_max_retry) {
      // - FIXED 60S RETRY DELAY - \\
      let delay = __bypass_retry_ms
      if (last_result.retry_after && !isNaN(last_result.retry_after)) {
        delay = Math.max(delay, last_result.retry_after * 1000)
      }

      // - TOTAL WAIT = RETRY DELAY + REMAINING GLOBAL BACKOFF - \\
      const backoff_remaining = __get_backoff_remaining_ms()
      const total_wait_ms     = delay + backoff_remaining

      console.warn(`[ - BYPASS - ] Attempt ${attempt} failed, retrying in ${total_wait_ms}ms (delay: ${delay}ms, backoff: ${backoff_remaining}ms)...`)

      if (on_retry) {
        try {
          console.warn(`[ - BYPASS - ] Executing on_retry callback for attempt ${attempt + 1}`)
          await on_retry(attempt + 1, total_wait_ms, last_result.api_code === "TASK_ALREADY_PROCESSING")
          console.warn(`[ - BYPASS - ] Finished on_retry callback for attempt ${attempt + 1}`)
        } catch (retry_err) {
          console.warn(`[ - BYPASS - ] Failed to execute on_retry callback:`, retry_err)
        }
      }
      console.warn(`[ - BYPASS - ] Waiting ${delay}ms before next attempt...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      console.warn(`[ - BYPASS - ] Wait finished, proceeding to next attempt...`)
    }
  }

  console.warn(`[ - BYPASS - ] All ${__bypass_max_retry} attempts failed for: ${url}`)
  return last_result
}


/**
 * @returns Promise with list of supported services
 */
export async function get_supported_services(): Promise<SupportedService[]> {
  try {
    const response = await __enqueue_bypass(async () => {
      const controller = new AbortController()
      const timeout_id = setTimeout(() => controller.abort(), 5000)

      try {
        return await fetch(`${__bypass_api_url.replace('/bypass', '/supported')}`, {
          method: "GET",
          headers: {
            "x-api-key": __bypass_api_key,
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
          },
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout_id)
      }
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data: any = await response.json()
    return data.result || []

  } catch (error: any) {
    console.error(`[ - BYPASS - ] Error fetching services:`, error.message)
    return []
  }
}
