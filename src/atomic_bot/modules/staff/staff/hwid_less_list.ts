import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "@shared/types/command"
import { component, db, logger }                            from "@shared/utils"

const __log = logger.create_logger("hwid_less_list")

interface hwid_less_schedule {
  guild_id       : string
  channel_id     : string
  scheduled_time : Date
  enabled        : boolean
  created_by     : string
  executed       : boolean
  created_at     : Date
}

const __collection = "hwid_less_schedule"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("hwid-less-list")
    .setDescription("View all HWID-Less schedules"),

  async execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true })

    const schedules = await db.find_many_sorted<hwid_less_schedule>(
      __collection,
      { guild_id: interaction.guildId! },
      "scheduled_time",
      "ASC"
    )

    if (!schedules || schedules.length === 0) {
      await interaction.editReply({
        content: "No HWID-Less schedules found.",
      })
      return
    }

    const pending_schedules  = schedules.filter((s: hwid_less_schedule) => !s.executed)
    const executed_schedules = schedules.filter((s: hwid_less_schedule) => s.executed)

    let description = ""

    if (pending_schedules.length > 0) {
      description += "**Pending Schedules:**\n"
      
      for (const schedule of pending_schedules) {
        const status      = schedule.enabled ? "ON" : "OFF"
        const unix_time   = Math.floor(schedule.scheduled_time.getTime() / 1000)
        const created_by  = `<@${schedule.created_by}>`
        
        description += `• **${status}** - <t:${unix_time}:F> (<t:${unix_time}:R>) by ${created_by}\n`
      }
      
      description += "\n"
    }

    if (executed_schedules.length > 0) {
      description += "**Executed Schedules:**\n"
      
      for (const schedule of executed_schedules.slice(-5)) {
        const status      = schedule.enabled ? "ON" : "OFF"
        const unix_time   = Math.floor(schedule.scheduled_time.getTime() / 1000)
        const created_by  = `<@${schedule.created_by}>`
        
        description += `• **${status}** - <t:${unix_time}:F> by ${created_by}\n`
      }
    }

    await interaction.editReply(
      component.build_message({
        content    : "",
        components : [
          component.text([
            "# HWID-Less Schedules",
            description.trim()
          ])
        ]
      })
    )

  } catch (error) {
    __log.error("[ - HWID-LESS LIST - ] Error listing schedules:", error)
    
    await interaction.editReply({
      content: "An error occurred while listing schedules.",
    })
  }
  },
}
