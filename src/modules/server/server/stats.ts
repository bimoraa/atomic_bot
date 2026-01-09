import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                      from "discord.js"
import { Command }     from "../../../shared/types/command"
import { component }   from "../../../shared/utils"
import * as os         from "os"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show bot CPU, RAM, and uptime statistics"),

  async execute(interaction: ChatInputCommandInteraction) {
    const total_memory = os.totalmem()
    const free_memory  = os.freemem()
    const used_memory  = total_memory - free_memory

    const memory_usage_percent = ((used_memory / total_memory) * 100).toFixed(1)
    const used_memory_gb       = (used_memory / 1024 / 1024 / 1024).toFixed(2)
    const total_memory_gb      = (total_memory / 1024 / 1024 / 1024).toFixed(2)

    const process_memory       = process.memoryUsage()
    const heap_used_mb         = (process_memory.heapUsed / 1024 / 1024).toFixed(2)
    const heap_total_mb        = (process_memory.heapTotal / 1024 / 1024).toFixed(2)

    const cpus                 = os.cpus()
    const cpu_model            = cpus[0].model
    const cpu_count            = cpus.length

    let total_idle             = 0
    let total_tick             = 0

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        total_tick += cpu.times[type as keyof typeof cpu.times]
      }
      total_idle += cpu.times.idle
    })

    const cpu_usage_percent = (100 - (100 * total_idle) / total_tick).toFixed(1)

    const uptime_seconds    = process.uptime()
    const days              = Math.floor(uptime_seconds / 86400)
    const hours             = Math.floor((uptime_seconds % 86400) / 3600)
    const minutes           = Math.floor((uptime_seconds % 3600) / 60)
    const seconds           = Math.floor(uptime_seconds % 60)

    const uptime_string     = `${days}d ${hours}h ${minutes}m ${seconds}s`

    const stats_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("### Bot Statistics"),
            component.divider(),
            component.text([
              "### CPU Usage",
              `Model: ${cpu_model}`,
              `Cores: ${cpu_count}`,
              `Usage: ${cpu_usage_percent}%`,
            ]),
            component.divider(),
            component.text([
              "### Memory Usage",
              `System: ${used_memory_gb} GB / ${total_memory_gb} GB (${memory_usage_percent}%)`,
              `Bot Heap: ${heap_used_mb} MB / ${heap_total_mb} MB`,
            ]),
            component.divider(),
            component.text([
              "### Uptime",
              uptime_string,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...stats_message,
      ephemeral: true,
    })
  },
}
