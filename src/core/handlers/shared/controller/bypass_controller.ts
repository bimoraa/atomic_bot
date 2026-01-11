import axios from "axios"
import { client } from "../../../../index"
import { log_error } from "../../../../shared/utils/error_logger"

const BYPASS_API_KEY = process.env.BYPASS_API_KEY || ""
const BYPASS_API_URL = "https://api.izen.lol/v1/bypass"

interface BypassResponse {
  success : boolean
  result? : string
  error?  : string
  time?   : number
}

/**
 * - BYPASS LINK USING IZEN.LOL API - \\
 * 
 * @param url - The URL to bypass
 * @returns Promise with bypass result
 */
export async function bypass_link(url: string): Promise<BypassResponse> {
  try {
    console.log(`[ - BYPASS - ] Attempting to bypass URL: ${url}`)
    
    const encoded_url = encodeURIComponent(url)
    const start_time  = Date.now()
    
    const response = await axios.get(`${BYPASS_API_URL}?url=${encoded_url}`, {
      headers: {
        "x-api-key": BYPASS_API_KEY,
      },
      timeout: 30000,
    })
    
    const process_time = ((Date.now() - start_time) / 1000).toFixed(2)
    
    console.log(`[ - BYPASS - ] API Response:`, JSON.stringify(response.data))
    
    if (response.data && response.data.result) {
      console.log(`[ - BYPASS - ] Successfully bypassed in ${process_time}s`)
      return {
        success : true,
        result  : response.data.result,
        time    : parseFloat(process_time),
      }
    }
    
    console.log(`[ - BYPASS - ] No result found in response, full data:`, response.data)
    return {
      success : false,
      error   : "No result found in response",
    }
    
  } catch (error: any) {
    console.error(`[ - BYPASS - ] Error bypassing link:`, error.message)
    log_error(client, error, "bypass_link", { url })
    
    return {
      success : false,
      error   : error.response?.data?.message || error.message || "Unknown error occurred",
    }
  }
}

/**
 * - GET SUPPORTED SERVICES - \\
 * 
 * @returns Promise with list of supported services
 */
export async function get_supported_services(): Promise<string[]> {
  try {
    const response = await axios.get("https://api.izen.lol/v1/supported", {
      headers: {
        "x-api-key": BYPASS_API_KEY,
      },
      timeout: 10000,
    })
    
    return response.data.services || []
    
  } catch (error: any) {
    console.error(`[ - BYPASS - ] Error fetching supported services:`, error.message)
    log_error(client, error, "get_supported_services", {})
    return []
  }
}
