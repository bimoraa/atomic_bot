import { Client } from "discord.js";

const roblox_update_channel_id = "1395947216375513298";
const check_interval = 60000;

let last_version: string | null = null;

interface RobloxVersionInfo {
  version: string;
  client_version: string;
  platform: string;
}

async function get_roblox_version(): Promise<RobloxVersionInfo | null> {
  try {
    const response = await fetch("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer");
    if (!response.ok) return null;
    
    const data = await response.json() as { version: string; clientVersionUpload: string };
    return {
      version: data.version,
      client_version: data.clientVersionUpload,
      platform: "Windows",
    };
  } catch {
    return null;
  }
}

async function send_update_notification(client: Client, version_info: RobloxVersionInfo) {
  const channel_url = `https://discord.com/api/v10/channels/${roblox_update_channel_id}/messages`;
  
  const unix_timestamp = Math.floor(Date.now() / 1000);

  await fetch(channel_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
    body: JSON.stringify({
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `## Roblox Update Detected\nA new Roblox client version has been released!`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true",
                },
              },
            },
            {
              type: 10,
              content: `- **Version:** \`${version_info.version}\`\n- **Client Version:** \`${version_info.client_version}\`\n- **Platform:** ${version_info.platform}\n- **Detected At:** <t:${unix_timestamp}:F> (<t:${unix_timestamp}:R>)`,
            },
            {
              type: 14,
            },
            {
              type: 10,
              content: `-# This is a live update, Roblox exploits are patched. Do not downgrade!`,
            },
          ],
        },
      ],
    }),
  });

  console.log(`[roblox_update] Sent notification for version ${version_info.version}`);
}

export async function start_roblox_update_checker(client: Client) {
  const initial_version = await get_roblox_version();
  if (initial_version) {
    last_version = initial_version.version;
    console.log(`[roblox_update] Initial version: ${last_version}`);
  }

  setInterval(async () => {
    const version_info = await get_roblox_version();
    if (!version_info) return;

    if (last_version && version_info.version !== last_version) {
      await send_update_notification(client, version_info);
    }

    last_version = version_info.version;
  }, check_interval);

  console.log(`[roblox_update] Checker started (interval: ${check_interval / 1000}s)`);
}

export async function test_roblox_update_notification(): Promise<RobloxVersionInfo | null> {
  const version_info = await get_roblox_version();
  if (!version_info) return null;

  const channel_url = `https://discord.com/api/v10/channels/${roblox_update_channel_id}/messages`;

  const unix_timestamp = Math.floor(Date.now() / 1000);

  await fetch(channel_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
    body: JSON.stringify({
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `## Roblox Update Detected\nA new Roblox client version has been released!`,
                },
                {
                  type: 10,
                  content: `- **Version:** \`${version_info.version}\`\n- **Client Version:** \`${version_info.client_version}\`\n- **Platform:** ${version_info.platform}\n- **Detected At:** <t:${unix_timestamp}:F> (<t:${unix_timestamp}:R>)`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true",
                },
              },
            },
            {
              type: 14,
            },
            {
              type: 10,
              content: `-# Make sure to update your scripts accordingly.`,
            },
          ],
        },
      ],
    }),
  });

  return version_info;
}
