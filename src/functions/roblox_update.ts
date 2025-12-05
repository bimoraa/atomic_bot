import { Client } from "discord.js"
import { load_config } from "../configuration/loader"
import { component, api, time, format } from "../utils"

const config = load_config<{ roblox_update_channel_id: string }>("roblox_update")
const roblox_update_channel_id = config.roblox_update_channel_id
const check_interval = 60000

let last_version: string | null = null

interface RobloxVersionInfo {
  version: string
  client_version: string
  platform: string
}

async function get_roblox_version(): Promise<RobloxVersionInfo | null> {
  try {
    const response = await fetch("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer")
    if (!response.ok) return null

    const data = (await response.json()) as { version: string; clientVersionUpload: string }
    return {
      version: data.version,
      client_version: data.clientVersionUpload,
      platform: "Windows",
    }
  } catch {
    return null
  }
}

async function send_update_notification(client: Client, version_info: RobloxVersionInfo) {
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

  console.log(`[roblox_update] Sent notification for version ${version_info.version}`)
}

export async function start_roblox_update_checker(client: Client) {
  const initial_version = await get_roblox_version()
  if (initial_version) {
    last_version = initial_version.version
    console.log(`[roblox_update] Initial version: ${last_version}`)
  }

  setInterval(async () => {
    const version_info = await get_roblox_version()
    if (!version_info) return

    if (last_version && version_info.version !== last_version) {
      await send_update_notification(client, version_info)
    }

    last_version = version_info.version
  }, check_interval)

  console.log(`[roblox_update] Checker started (interval: ${check_interval / 1000}s)`)
}

export async function test_roblox_update_notification(): Promise<RobloxVersionInfo | null> {
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

  return version_info
}
