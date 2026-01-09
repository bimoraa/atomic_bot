import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command }                 from "../../../shared/types/command"
import { update_project_settings } from "../../../infrastructure/api/luarmor"
import { component, db, logger }   from "../../../shared/utils"

const __log              = logger.create_logger("schedule_hwid_less")
const PROJECT_ID         = "6958841b2d9e5e049a24a23e376e0d77"
const REQUIRED_ROLE_ID   = "1316021423206039596"
const NOTIFICATION_USER  = "1118453649727823974"
const COLLECTION         = "hwid_less_schedule"

interface hwid_less_schedule {
  id?             : any
  guild_id        : string
  channel_id      : string
  scheduled_time  : number
  enabled         : boolean
  created_by      : string
  executed        : boolean
  created_at      : number
}

let __scheduler_running = false

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("schedule-hwid-less")
    .setDescription("Schedule HWID-less mode to be enabled at a specific time")
    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("Time to enable HWID-less (e.g., '2026-01-03 20:00' or '20:00')")
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName("enabled")
        .setDescription("Enable or disable HWID-less mode")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("timezone")
        .setDescription("Timezone for the scheduled time")
        .setRequired(false)
        .addChoices(
          { name: "WIB (UTC+7)", value: "WIB" },
          { name: "WITA (UTC+8)", value: "WITA" },
          { name: "WIT (UTC+9)", value: "WIT" },
          { name: "UTC", value: "UTC" }
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member as GuildMember

      if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
        await interaction.reply({
          content   : "You do not have permission to use this command.",
          ephemeral : true,
        })
        return
      }

      await interaction.deferReply()

      const time_input = interaction.options.getString("time", true)
      const enabled    = interaction.options.getBoolean("enabled", true)
      const timezone   = interaction.options.getString("timezone") || "WIB"

      const scheduled_time = parse_time(time_input, timezone)

      if (!scheduled_time || scheduled_time.getTime() <= Date.now()) {
        await interaction.editReply({
          content: `Invalid time format or time is in the past. Use format like '2026-01-03 20:00' or '20:00' for today (${timezone}).`,
        })
        return
      }

      const existing_schedule = await db.find_one<hwid_less_schedule>(
        COLLECTION,
        {
          guild_id : interaction.guildId!,
          enabled  : enabled,
          executed : false,
        }
      )

      if (existing_schedule) {
        const existing_status = enabled ? "ON" : "OFF"
        const existing_unix   = Math.floor(existing_schedule.scheduled_time / 1000)
        
        await interaction.editReply({
          content: `A schedule for HWID-Less **${existing_status}** already exists at <t:${existing_unix}:F>. Please delete it first before creating a new one.`,
        })
        return
      }

      await db.insert_one<hwid_less_schedule>(
        COLLECTION,
        {
          guild_id       : interaction.guildId!,
          channel_id     : interaction.channelId!,
          scheduled_time : scheduled_time.getTime(),
          enabled        : enabled,
          created_by     : interaction.user.id,
          executed       : false,
          created_at     : Date.now(),
        }
      )

      const status          = enabled ? "Enabled" : "Disabled"
      const scheduled_unix  = Math.floor(scheduled_time.getTime() / 1000)

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xE91E63,
            components: [
              component.text("## HWID-Less Scheduled"),
            ],
          }),
          component.container({
            components: [
              component.text([
                "## Details:",
                `- Timezone: **${timezone}**`,
                `- Status: **${status}**`,
                `- Scheduled Time: <t:${scheduled_unix}:F> (<t:${scheduled_unix}:R>)`,
                `- Scheduled by: <@${interaction.user.id}>`,
                `- Project \`${PROJECT_ID}\``,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)

      if (!__scheduler_running) {
        start_scheduler(interaction.client)
      }

      __log.info(`Scheduled HWID-less ${status} for ${scheduled_time.toISOString()}`)
    } catch (err) {
      __log.error("Error scheduling HWID-less:", err)
      if (interaction.deferred) {
        await interaction.editReply({ content: "An error occurred while scheduling HWID-less." })
      } else {
        await interaction.reply({ content: "An error occurred while scheduling HWID-less." })
      }
    }
  },
}

function parse_time(input: string, timezone: string = "WIB"): Date | null {
  try {
    const timezone_offsets: Record<string, number> = {
      WIB  : 7,
      WITA : 8,
      WIT  : 9,
      UTC  : 0,
    }

    const offset = timezone_offsets[timezone] || 7
    const now    = new Date()

    let local_time: Date

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(input)) {
      const [date_part, time_part] = input.split(" ")
      const [year, month, day]     = date_part.split("-").map(Number)
      const [hours, minutes]       = time_part.split(":").map(Number)
      
      local_time = new Date(year, month - 1, day, hours, minutes, 0)
    } else if (/^\d{2}:\d{2}$/.test(input)) {
      const [hours, minutes] = input.split(":").map(Number)
      local_time             = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)

      if (local_time.getTime() - (offset * 60 * 60 * 1000) <= now.getTime()) {
        local_time.setDate(local_time.getDate() + 1)
      }
    } else {
      return null
    }

    const utc_time = new Date(local_time.getTime() - (offset * 60 * 60 * 1000))

    return utc_time
  } catch {
    return null
  }
}

async function start_scheduler(client: any): Promise<void> {
  if (__scheduler_running) {
    __log.info("Scheduler already running")
    return
  }

  __scheduler_running = true
  __log.info("Starting HWID-less scheduler")

  const check_schedules = async () => {
    try {
      const now = Date.now()
      __log.info(`Checking schedules at ${new Date().toISOString()}`)
      
      const schedules = await db.find_many<hwid_less_schedule>(
        COLLECTION,
        {
          executed       : false,
          scheduled_time : { $lte: now },
        }
      )

      __log.info(`Found ${schedules.length} pending schedules`)

      for (const schedule of schedules) {
        try {
          __log.info(`Executing scheduled HWID-less: ${schedule.enabled}`)

          const result = await update_project_settings(PROJECT_ID, schedule.enabled)

          if (result.success) {
            await db.update_one(
              COLLECTION,
              { scheduled_time: schedule.scheduled_time, created_by: schedule.created_by },
              { executed: true }
            )

            const status = schedule.enabled ? "Enabled" : "Disabled"

            try {
              const channel = await client.channels.fetch(schedule.channel_id)
              if (channel && channel.isTextBased()) {
                const channel_message = component.build_message({
                  components: [
                    component.container({
                      accent_color: 0xE91E63,
                      components: [
                        component.text("## HWID-Less Update Success!!"),
                      ],
                    }),
                    component.container({
                      components: [
                        component.text([
                          "## Details:",
                          `- Status: **${status}**`,
                          `- Scheduled by: <@${schedule.created_by}>`,
                          `- Executed at: <t:${Math.floor(Date.now() / 1000)}:F>`,
                          `- Project \`${PROJECT_ID}\``,
                        ]),
                      ],
                    }),
                  ],
                })

                await channel.send(channel_message)
              }
            } catch (channel_error) {
              __log.error("Failed to send channel notification:", channel_error)
            }

            try {
              const notification_user = await client.users.fetch(NOTIFICATION_USER)
              const dm_message        = component.build_message({
                components: [
                  component.container({
                    accent_color: 0xE91E63,
                    components: [
                      component.text("## Scheduled HWID-Less Executed"),
                    ],
                  }),
                  component.container({
                    components: [
                      component.text([
                        "## Details:",
                        `- Status: **${status}**`,
                        `- Scheduled by: <@${schedule.created_by}>`,
                        `- Executed at: <t:${Math.floor(Date.now() / 1000)}:F>`,
                        `- Project \`${PROJECT_ID}\``,
                      ]),
                    ],
                  }),
                ],
              })

              await notification_user.send(dm_message)
            } catch (dm_error) {
              __log.error("Failed to send DM notification:", dm_error)
            }

            __log.info(`Successfully executed scheduled HWID-less: ${status}`)
          } else {
            __log.error(`Failed to execute scheduled HWID-less: ${result.error}`)
          }
        } catch (schedule_error) {
          __log.error("Error executing schedule:", schedule_error)
        }
      }
    } catch (err) {
      __log.error("Error in scheduler loop:", err)
    }
  }

  await check_schedules()

  setInterval(check_schedules, 10000)
}

export default command
export { start_scheduler }
