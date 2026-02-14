// - BYPASS LINK SERVICE - \\

const __bypass_api_key = process.env.BYPASS_API_KEY || ""
const __bypass_api_url = process.env.BYPASS_API_URL || ""

// - PERFORMANCE OPTIMIZATION - \\
const __bypass_timeout = 60000

interface BypassResponse {
  success : boolean
  result? : string
  error?  : string
  time?   : number
}

interface SupportedService {
  name    : string
  type    : string
  status  : string
  domains : string[]
}

/**
 * @param url - The URL to bypass
 * @returns Promise with bypass result
 */
export async function bypass_link(url: string): Promise<BypassResponse> {
  const trimmed_url = url.trim()

  try {
    const start_time  = Date.now()
    const params      = new URLSearchParams({ url: trimmed_url })

    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), __bypass_timeout)

    const response = await fetch(`${__bypass_api_url}?${params}`, {
      method  : "GET",
      headers : {
        "x-api-key"       : __bypass_api_key,
        "Accept-Encoding" : "gzip, deflate, br",
        "Connection"      : "keep-alive",
      },
      signal : controller.signal,
    })

    clearTimeout(timeout_id)

    if (!response.ok) {
      const error_data: any = await response.json().catch(() => ({}))
      throw new Error(error_data.message || `HTTP ${response.status}`)
    }

    const data: any    = await response.json()
    const process_time = ((Date.now() - start_time) / 1000).toFixed(2)

    if (data && data.result) {
      console.log(`[ - BYPASS - ] Success in ${process_time}s`)
      return {
        success : true,
        result  : data.result,
        time    : parseFloat(process_time),
      }
    }

    return {
      success : false,
      error   : "No result found in response",
    }

  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : ""
    const name    = typeof error?.name === "string" ? error.name : ""
    // - LOG AS WARN FOR EXPECTED API ERRORS TO REDUCE NOISE - \\
    if (message.includes("HTTP 5")) {
      console.warn(`[ - BYPASS - ] External API Error:`, message)
    } else if (message.includes("HTTP 429")) {
      console.warn(`[ - BYPASS - ] Rate Limit:`, message)
      console.warn(`[ - BYPASS - ] Debug 429:`, {
        url   : trimmed_url,
        api   : __bypass_api_url,
      })
    } else {
      console.error(`[ - BYPASS - ] Error:`, message || error)
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

    return {
      success : false,
      error   : error_message,
    }
  }
}

/**
 * @returns Promise with list of supported services
 */
export async function get_supported_services(): Promise<SupportedService[]> {
  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${__bypass_api_url.replace('/bypass', '/supported')}`, {
      method  : "GET",
      headers : {
        "x-api-key"       : __bypass_api_key,
        "Accept-Encoding" : "gzip, deflate, br",
        "Connection"      : "keep-alive",
      },
      signal: controller.signal,
    })

    clearTimeout(timeout_id)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data: any = await response.json()
    return data.result || []

  } catch (error: any) {
    console.error(`[ - BYPASS - ] Error fetching services:`, error.message)
    return []
  }
}
