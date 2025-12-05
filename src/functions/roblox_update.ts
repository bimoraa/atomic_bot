import { Client } from "discord.js"
import { load_config } from "../configuration/loader"
import { component, api, time, format, logger } from "../utils"

interface roblox_config {
  roblox_update_channel_id: string
}

interface roblox_version_info {
  version:        string
  client_version: string
  platform:       string
}

const config                   = load_config<roblox_config>("roblox_update")
const roblox_update_channel_id = config.roblox_update_channel_id
const check_interval           = 60000
const roblox_api_url           = "https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer"
const log                      = logger.create_logger("roblox_update")

let last_version: string | null = null

async function get_roblox_version(): Promise<roblox_version_info | null> {
  try {
    const response = await fetch(roblox_api_url)
    if (!response.ok) return null

    const data = (await response.json()) as { version: string; clientVersionUpload: string }

    return {
      version:        data.version,
      client_version: data.clientVersionUpload,
      platform:       "Windows",
    }
  } catch {
    log.error("Failed to fetch Roblox version")
    return null
  }
}

async function send_update_notification(
  client:       Client,
  version_info: roblox_version_info
): Promise<void> {
  const unix_timestamp = time.now()

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
            `- **Version:** ${format.code(version_info.version)}`,
            `- **Client Version:** ${format.code(version_info.client_version)}`,
            `- **Platform:** ${version_info.platform}`,
            `- **Detected At:** ${time.full_date_time(unix_timestamp)} (${time.relative_time(unix_timestamp)})`,
          ]),
          component.divider(),
          component.text(`-# This is a live update, Roblox exploits are patched. Do not downgrade!`),
        ],
      }),
    ],
  })

  await api.send_components_v2(roblox_update_channel_id, api.get_token(), message)
  log.info(`Sent notification for version ${version_info.version}`)
}

export async function start_roblox_update_checker(client: Client): Promise<void> {
  const initial_version = await get_roblox_version()

  if (initial_version) {
    last_version = initial_version.version
    log.info(`Initial version: ${last_version}`)
  }

  setInterval(async () => {
    const version_info = await get_roblox_version()
    if (!version_info) return

    if (last_version && version_info.version !== last_version) {
      await send_update_notification(client, version_info)
    }

    last_version = version_info.version
  }, check_interval)

  log.info(`Checker started (interval: ${check_interval / 1000}s)`)
}

export async function test_roblox_update_notification(): Promise<roblox_version_info | null> {
  const version_info = await get_roblox_version()
  if (!version_info) return null

  const unix_timestamp = time.now()

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Roblox Update Detected`,
              `A new Roblox client version has been released!`,
              ``,
              `- **Version:** ${format.code(version_info.version)}`,
              `- **Client Version:** ${format.code(version_info.client_version)}`,
              `- **Platform:** ${version_info.platform}`,
              `- **Detected At:** ${time.full_date_time(unix_timestamp)} (${time.relative_time(unix_timestamp)})`,
            ],
            thumbnail: format.logo_url,
          }),
          component.divider(),
          component.text(`-# Make sure to update your scripts accordingly.`),
        ],
      }),
    ],
  })

  await api.send_components_v2(roblox_update_channel_id, api.get_token(), message)
  log.info(`Test notification sent for version ${version_info.version}`)

  return version_info
}
