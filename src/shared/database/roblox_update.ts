import { Client } from "discord.js"
import { load_config } from "../config/loader"
import { component, api, time, format, logger } from "../utils"
import { get_platform_version, platform_targets, version_info } from "../utils/version"

interface roblox_config {
  roblox_update_channel_id: string
}

const __check_interval_ms  = 60000

const __config = load_config<roblox_config>("roblox_update")
const __log    = logger.create_logger("roblox_update")
const __platforms = platform_targets

const __last_versions = new Map<string, string>()
const __last_info     = new Map<string, version_info>()
function normalize_version_key(value: string): string {
  return value.replace(/^version-/, "")
}

async function send_notification(client: Client, info: version_info): Promise<void> {
  const timestamp = time.now()

  const updated_timestamp = Math.floor(new Date(info.updated_at).getTime() / 1000)
  
  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Roblox Update Detected`,
              `A new Roblox client version has been released!`,
            ],
            thumbnail: format.logo_url,
          }),
          component.text([
            `- **Version:** ${format.code(info.version)}`,
            `- **Client Version:** ${format.code(info.client_version)}`,
            `- **Platform:** ${info.platform}`,
            `- **Updated:** ${time.full_date_time(updated_timestamp)} (${time.relative_time(updated_timestamp)})`,
            `- **Detected At:** ${time.full_date_time(timestamp)} (${time.relative_time(timestamp)})`,
          ]),
          component.divider(),
          component.text(`-# This is a live update, Roblox exploits are patched. Do not downgrade!`),
        ],
      }),
    ],
  })

  await api.send_components_v2(__config.roblox_update_channel_id, api.get_token(), message)
  __log.info(`Sent notification for ${info.platform} version ${info.version}`)
}

export async function start_roblox_update_checker(client: Client): Promise<void> {
  for (const platform of __platforms) {
    const info = await get_platform_version(platform)
    if (info) {
      __last_versions.set(platform.key, info.version)
      __last_info.set(platform.key, info)
      __log.info(`Initial ${info.platform} version: ${info.version}`)
    }
  }

  setInterval(async () => {
    for (const platform of __platforms) {
      const info = await get_platform_version(platform)
      if (!info) continue

      const last_version = __last_versions.get(platform.key)
      if (!last_version) {
        __last_versions.set(platform.key, info.version)
        __last_info.set(platform.key, info)
        continue
      }

      const last_key    = normalize_version_key(last_version)
      const current_key = normalize_version_key(info.version)

      if (current_key !== last_key) {
        __last_versions.set(platform.key, info.version)
        __last_info.set(platform.key, info)
        await send_notification(client, info)
      } else if (last_version !== info.version) {
        // Normalize cache without spamming notifications if only formatting differs
        __last_versions.set(platform.key, info.version)
        __last_info.set(platform.key, info)
      }
    }
  }, __check_interval_ms)

  const platform_names = __platforms.map(p => p.name).join(", ")
  __log.info(`Checker started (interval: ${__check_interval_ms / 1000}s) for platforms: ${platform_names}`)
}

export async function get_platform_version_by_name(platform_name: string): Promise<version_info | null> {
  const platform = __platforms.find(p => p.name === platform_name)
  if (!platform) return null

  const cached = __last_info.get(platform.key)
  if (cached) return cached

  const info = await get_platform_version(platform)
  if (info) {
    __last_versions.set(platform.key, info.version)
    __last_info.set(platform.key, info)
  }

  return info
}

export async function test_roblox_update_notification(): Promise<version_info[] | null> {
  const infos: version_info[] = []
  
  for (const platform of __platforms) {
    const info = await get_platform_version(platform)
    if (info) {
      infos.push(info)
      await send_notification({} as Client, info)
    }
  }

  return infos.length > 0 ? infos : null
}