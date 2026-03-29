/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /bot-info slash command, shows bot information - \\
import { ChatInputCommandInteraction, SlashCommandBuilder, version as djsVersion } from "discord.js"
import { Command }  from "@shared/types/command"
import { component, time } from "@shared/utils"
import os from "os"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bot-info")
    .setDescription("Display bot system information"),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client

    // - uptime calculation - \\
    const uptime_seconds = Math.floor(client.uptime! / 1000)
    const days           = Math.floor(uptime_seconds / 86400)
    const hours          = Math.floor((uptime_seconds % 86400) / 3600)
    const minutes        = Math.floor((uptime_seconds % 3600) / 60)
    const seconds        = uptime_seconds % 60
    const uptime_text    = `${days}d ${hours}h ${minutes}m ${seconds}s`

    // - memory usage - \\
    const used_memory    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const total_memory   = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)
    
    // - system info - \\
    const platform       = os.platform()
    const arch           = os.arch()
    const node_version   = process.version
    const server_time    = time.full_date_time(time.now())
    const timezone       = Intl.DateTimeFormat().resolvedOptions().timeZone
    const locale         = Intl.DateTimeFormat().resolvedOptions().locale
    const server_loc     = `${os.hostname()} (${locale})`
    
    // - bot stats - \\
    const guild_count    = client.guilds.cache.size
    const user_count     = client.users.cache.size
    const channel_count  = client.channels.cache.size
    const ping           = client.ws.ping

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## ${client.user?.username} - Bot Information`),
          ],
        }),
        component.container({
          components: [
            component.text([
              `## System Information`,
              `- **Server Time:** ${server_time}`,
              `- **Timezone:** ${timezone}`,
              `- **Server Location:** ${server_loc}`,
              `- **Platform:** ${platform} (${arch})`,
              `- **Node Version:** ${node_version}`,
              `- **Discord.js:** v${djsVersion}`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              `## Performance`,
              `- **Uptime:** ${uptime_text}`,
              `- **Memory:** ${used_memory} MB / ${total_memory} MB`,
              `- **Latency:** ${ping}ms`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              `## Statistics`,
              `- **Servers:** ${guild_count}`,
              `- **Users:** ${user_count}`,
              `- **Channels:** ${channel_count}`,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...message, ephemeral: true,
    })
  },
}
