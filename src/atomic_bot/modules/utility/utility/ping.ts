import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                      from "discord.js"
import { Command }     from "@shared/types/command"
import { component, api, db } from "@shared/utils"
import { log_error }   from "@shared/utils/error_logger"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency and system health"),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true })

      const sent = await interaction.fetchReply()

      const ws_latency  = interaction.client.ws.ping
      const api_latency = sent.createdTimestamp - interaction.createdTimestamp

      let database_status    = "Disconnected"
      let database_latency   = "N/A"
      let database_pool_info = "N/A"

      if (db.is_connected()) {
        const db_start_time = Date.now()

        await db.get_pool().query("SELECT 1")

        const db_end_time  = Date.now()
        const db_ping_time = db_end_time - db_start_time
        const pool_stats   = db.get_pool_stats()

        database_status  = "Connected"
        database_latency = `${db_ping_time}ms`

        if (pool_stats) {
          database_pool_info = `${pool_stats.total} total / ${pool_stats.idle} idle / ${pool_stats.waiting} waiting`
        }
      }

      const client_uptime_seconds = Math.floor((interaction.client.uptime || 0) / 1000)
      const uptime_days           = Math.floor(client_uptime_seconds / 86400)
      const uptime_hours          = Math.floor((client_uptime_seconds % 86400) / 3600)
      const uptime_minutes        = Math.floor((client_uptime_seconds % 3600) / 60)
      const uptime_text           = `${uptime_days}d ${uptime_hours}h ${uptime_minutes}m`

      const heap_used_mb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
      const shard_count  = interaction.client.shard?.count || 1

      const ping_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Pong"),
              component.divider(),
              component.text([
                `- WebSocket: ${ws_latency}ms`,
                `- API Latency: ${api_latency}ms`,
                `- Database: ${database_status} (${database_latency})`,
                `- DB Pool: ${database_pool_info}`,
                `- Uptime: ${uptime_text}`,
                `- Memory: ${heap_used_mb} MB`,
                `- Shards: ${shard_count}`,
              ]),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, ping_message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "ping_command", {
        user   : interaction.user.id,
        channel: interaction.channelId,
      })

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Failed to check bot latency. Please try again."),
            ],
          }),
        ],
      })

      if (interaction.deferred) {
        await api.edit_deferred_reply(interaction, error_message)
        return
      }

      if (!interaction.replied) {
        await interaction.reply({ ...error_message, ephemeral: true })
      }
    }
  },
}
