import { client } from "../../../../index"
import { log_error } from "../../../../shared/utils/error_logger"

const BYPASS_API_KEY = process.env.BYPASS_API_KEY || ""
const BYPASS_API_URL = process.env.BYPASS_API_URL || ""

// - PERFORMANCE OPTIMIZATION - \\
const BYPASS_TIMEOUT = 60000

interface BypassResponse {
  success: boolean
  result?: string
  error?: string
  time?: number
}

/**
 * @param url - The URL to bypass
 * @returns Promise with bypass result
 */
export async function bypass_link(url: string): Promise<BypassResponse> {
  try {
    const trimmed_url = url.trim()
    const start_time = Date.now()
    const params = new URLSearchParams({ url: trimmed_url })

    const response = await fetch(`${BYPASS_API_URL}?${params}`, {
      method: "GET",
      headers: {
        "x-api-key": BYPASS_API_KEY,
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
    })

    if (!response.ok) {
      const error_data: any = await response.json().catch(() => ({}))
      throw new Error(error_data.message || `HTTP ${response.status}`)
    }

    const data: any = await response.json()
    const process_time = ((Date.now() - start_time) / 1000).toFixed(2)

    if (data && data.result) {
      console.log(`[ - BYPASS - ] Success in ${process_time}s`)
      return {
        success: true,
        result: data.result,
        time: parseFloat(process_time),
      }
    }

    return {
      success: false,
      error: "No result found in response",
    }

  } catch (error: any) {
    // - LOG AS WARN FOR EXPECTED API ERRORS TO REDUCE NOISE - \\
    if (error.message.includes("HTTP 5")) {
      console.warn(`[ - BYPASS - ] External API Error:`, error.message)
    } else if (error.message.includes("HTTP 429")) {
      console.warn(`[ - BYPASS - ] Rate Limit:`, error.message)
    } else {
      console.error(`[ - BYPASS - ] Error:`, error.message)
    }

    let error_message = "Unknown error occurred"

    if (error.name === "AbortError" || error.message.includes("aborted")) {
      error_message = "Request timeout - Please try again later."
    } else if (error.message.includes("not supported") || error.message.includes("unsupported")) {
      error_message = "Link is not supported."
    } else if (error.message.includes("429")) {
      error_message = "Rate limit exceeded - Please wait a moment."
    } else if (error.message.includes("5")) {
      error_message = "Service unavailable - Please try again later."
    } else if (error.message) {
      error_message = error.message
    }

    return {
      success: false,
      error: error_message,
    }
  }
}

interface SupportedService {
  name: string
  type: string
  status: string
  domains: string[]
}

interface SupportedResponse {
  status: string
  result: SupportedService[]
}

/**
 * - GET SUPPORTED SERVICES - \\
 * 
 * @returns Promise with list of supported services
 */
export async function get_supported_services(): Promise<SupportedService[]> {
  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${BYPASS_API_URL.replace('/bypass', '/supported')}`, {
      method: "GET",
      headers: {
        "x-api-key": BYPASS_API_KEY,
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
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
