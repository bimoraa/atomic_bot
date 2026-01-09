import * as http from "./http"
import * as logger from "./logger"
import * as db from "./database"

export interface version_info {
  version:        string
  client_version: string
  platform:       string
  updated_at:     string
}

interface version_data {
  version:               string
  date:                  string
  client_version_upload?: string
}

interface platform_target {
  key:      string
  name:     string
  endpoint: string
  type:     "roblox_api" | "itunes" | "playstore"
}

interface version_record {
  platform:   string
  version:    string
  updated_at: string
}

const __user_agent         = "Roblox/WinInet"
const __android_package_id = "com.roblox.client"
const __ios_app_id         = "431946152"

const __log                = logger.create_logger("version_util")
const __version_collection = "roblox_versions"

async function get_stored_version(platform: string): Promise<version_record | null> {
  try {
    return await db.find_one<version_record>(__version_collection, { platform })
  } catch (err) {
    return null
  }
}

async function store_version(platform: string, version: string, updated_at: string): Promise<void> {
  try {
    await db.update_one<version_record>(
      __version_collection,
      { platform },
      { platform, version, updated_at },
      true
    )
  } catch (err) {
    __log.error(`Failed to store version: ${err}`)
  }
}

const __deploy_history_cache      = new Map<string, string>()
const __deploy_history_cache_time = new Map<string, number>()
const __deploy_history_cache_ttl  = 300000

const __deploy_history_urls: Record<string, string> = {
  WindowsPlayer: "https://setup.rbxcdn.com/DeployHistory.txt",
  MacPlayer:     "https://setup.rbxcdn.com/mac/DeployHistory.txt",
}

async function fetch_deploy_history(endpoint: string): Promise<string> {
  const now    = Date.now()
  const cached = __deploy_history_cache.get(endpoint)
  const time   = __deploy_history_cache_time.get(endpoint) || 0

  if (cached && now - time < __deploy_history_cache_ttl) {
    return cached
  }

  const url = __deploy_history_urls[endpoint] || __deploy_history_urls.WindowsPlayer

  try {
    const text = await http.get_text(url, { "User-Agent": __user_agent })
    __deploy_history_cache.set(endpoint, text)
    __deploy_history_cache_time.set(endpoint, now)
    return text
  } catch (err) {
    return cached || ""
  }
}

function parse_deploy_date(version_hash: string, history: string): string | undefined {
  const escaped = version_hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex   = new RegExp(`${escaped}\\s+at\\s+([\\d/]+\\s+[\\d:]+\\s*(?:AM|PM)?)`, "i")
  const match   = history.match(regex)

  if (match && match[1]) {
    const parsed = new Date(match[1])
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return undefined
}

export const platform_targets: platform_target[] = [
  { key: "Windows", name: "Windows", endpoint: "WindowsPlayer",        type: "roblox_api" },
  { key: "Mac",     name: "Mac",     endpoint: "MacPlayer",            type: "roblox_api" },
  { key: "Android", name: "Android", endpoint: __android_package_id,   type: "playstore" },
  { key: "iOS",     name: "iOS",     endpoint: __ios_app_id,           type: "itunes" },
]

function normalize_version_key(value: string): string {
  return value.replace(/^version-/, "")
}

function parse_playstore_date(raw: string | null): string {
  if (!raw) return new Date().toISOString()
  const parsed = new Date(raw)
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function parse_upload_timestamp(value: unknown): string | undefined {
  if (typeof value === "number") {
    const millis = value > 1e12 ? value : value * 1000
    const date   = new Date(millis)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  if (typeof value === "string") {
    const as_number = Number(value)
    if (!Number.isNaN(as_number)) {
      const millis = as_number > 1e12 ? as_number : as_number * 1000
      const date   = new Date(millis)
      return isNaN(date.getTime()) ? undefined : date.toISOString()
    }

    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  }

  return undefined
}

async function fetch_playstore_version(package_id: string): Promise<version_data | null> {
  try {
    const url  = `https://play.google.com/store/apps/details?id=${package_id}&hl=en&gl=us`
    const html = await http.get_text(url, { "User-Agent": __user_agent })
    
    const version_match = html.match(/\[\[\["([\d.]+)"\]\]/)
    if (!version_match || !version_match[1]) return null

    const date_match = html.match(/Updated.*?(\d{1,2}\/\d{1,2}\/\d{4})/)
    return {
      version: version_match[1],
      date:    parse_playstore_date(date_match ? date_match[1] : null),
    }
  } catch (error) {
    __log.error(`Failed to fetch Play Store version: ${error}`)
    return null
  }
}

async function fetch_itunes_version(app_id: string): Promise<version_data | null> {
  try {
    const url  = `https://itunes.apple.com/lookup?id=${app_id}&country=us`
    const data = await http.get<any>(url, { "User-Agent": __user_agent })
    
    if (!data?.results?.[0]) return null

    const result = data.results[0]
    return {
      version: result.version || "0.0.0.0",
      date:    result.currentVersionReleaseDate || new Date().toISOString(),
    }
  } catch (error) {
    __log.error(`Failed to fetch iTunes version: ${error}`)
    return null
  }
}

async function fetch_roblox_api_version(endpoint: string): Promise<version_data | null> {
  try {
    const url = `https://clientsettingscdn.roblox.com/v2/client-version/${endpoint}`

    const res  = await http.request<any>(url, { headers: { "User-Agent": __user_agent } })
    const data = res.data

    const upload_id = typeof data.clientVersionUpload === "string"
      ? data.clientVersionUpload.replace(/^version-/, "")
      : undefined

    let deploy_date: string | undefined
    if (upload_id) {
      const history = await fetch_deploy_history(endpoint)
      deploy_date   = parse_deploy_date(upload_id, history)
    }

    const final_date = deploy_date || new Date().toISOString()

    return {
      version:               data.version || "0.0.0.0",
      date:                  final_date,
      client_version_upload: upload_id,
    }
  } catch (error) {
    __log.error(`Failed to fetch Roblox API version: ${error}`)
    return null
  }
}

async function get_version_data(target: platform_target): Promise<version_data | null> {
  switch (target.type) {
    case "roblox_api":
      return await fetch_roblox_api_version(target.endpoint)
    case "playstore":
      return await fetch_playstore_version(target.endpoint)
    case "itunes":
      return await fetch_itunes_version(target.endpoint)
    default:
      return null
  }
}

export async function get_platform_version(target: platform_target): Promise<version_info | null> {
  const data = await get_version_data(target)
  if (!data?.version) return null

  const upload_id        = data.client_version_upload
  const normalized_id    = upload_id ? normalize_version_key(upload_id) : normalize_version_key(data.version)
  const version_tag      = `version-${normalized_id}`
  const client_ver       = normalize_version_key(data.version)

  const stored = await get_stored_version(target.name)

  let final_date: string
  if (stored && stored.version === version_tag) {
    final_date = stored.updated_at
  } else {
    final_date = new Date().toISOString()
    await store_version(target.name, version_tag, final_date)
  }

  return {
    version:        version_tag,
    client_version: client_ver,
    platform:       target.name,
    updated_at:     final_date,
  }
}

export async function get_platform_version_by_name(platform_name: string): Promise<version_info | null> {
  const platform = platform_targets.find(p => p.name === platform_name)
  if (!platform) return null

  return await get_platform_version(platform)
}
