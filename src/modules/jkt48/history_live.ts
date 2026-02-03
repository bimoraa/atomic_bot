import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { component, db }                                    from "../../shared/utils"
import { log_error }                                        from "../../shared/utils/error_logger"

interface live_history_record {
  platform      : string
  member_name   : string
  title         : string
  url           : string
  image         : string
  viewers       : number
  comments      : number
  comment_users : number
  total_gold    : number
  started_at    : number
  ended_at      : number
  duration_ms   : number
}

/**
 * - FORMAT DURATION - \\
 * @param {number} duration_ms - Duration in milliseconds
 * @returns {string} Human readable duration
 */
function format_duration(duration_ms: number): string {
  const total_seconds = Math.max(0, Math.floor(duration_ms / 1000))
  const hours = Math.floor(total_seconds / 3600)
  const minutes = Math.floor((total_seconds % 3600) / 60)
  const seconds = total_seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("history-live")
    .setDescription("View JKT48 live history")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Choose the live platform")
        .setRequired(true)
        .addChoices(
          { name: "IDN", value: "idn" },
          { name: "Showroom", value: "showroom" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const platform = interaction.options.getString("platform", true)
      const history = await db.find_many_sorted<live_history_record>(
        "live_history",
        { platform: platform },
        "ended_at",
        "DESC"
      )

      if (!history || history.length === 0) {
        const empty_message = component.build_message({
          components: [
            component.container({
              accent_color : 0xFEE75C,
              components   : [
                component.text("## Live History ( 0 )"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  `No live history available for ${platform === "showroom" ? "Showroom" : "IDN"}.`,
                  "",
                  "Check back after members go live.",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(empty_message)
        return
      }

      const max_show = 5
      const shown = history.slice(0, max_show)

      const header_component = component.container({
        accent_color : null,
        components   : [
          component.text(`## Live History ( ${history.length} )`),
        ],
      })

      const history_components = shown.map((record) => {
        const description = record.title ? `> ${record.title}` : ""
        const started_timestamp = Math.floor(record.started_at / 1000)
        const ended_timestamp = Math.floor(record.ended_at / 1000)
        const duration_text = format_duration(record.duration_ms)
        const comment_text = `${record.comments.toLocaleString()} of ${record.comment_users.toLocaleString()} Users`

        return component.container({
          components: [
            component.section({
              content   : [`### ${record.member_name}`, description].filter(Boolean),
              accessory : component.link_button("Watch", record.url),
            }),
            component.divider(2),
            component.section({
              content: [
                `- **Viewers:** ${record.viewers.toLocaleString()}`,
                `- **Started:** <t:${started_timestamp}:F>`,
                `- **End Live:** <t:${ended_timestamp}:F>`,
                `- **Duration:** ${duration_text}`,
                `- **Comments:** ${comment_text}`,
                `- **Total Gold:** ${record.total_gold.toLocaleString()} G`,
              ],
              accessory : record.image ? component.thumbnail(record.image) : undefined,
            }),
          ],
        })
      })

      const previous_member = history.length > 1
        ? history[history.length - 1]?.member_name
        : "None"
      const next_member = history.length > 1
        ? history[1]?.member_name
        : "None"
      const previous_disabled = history.length <= 1
      const next_disabled = history.length <= 1

      const footer_component = component.container({
        components: [
          component.action_row(
            component.secondary_button(previous_member, "history_live_prev", undefined, previous_disabled),
            component.secondary_button(next_member, "history_live_next", undefined, next_disabled)
          ),
          component.divider(2),
          component.text(`Last Refreshed: <t:${Math.floor(Date.now() / 1000)}:R> - By **${interaction.user.username}**`),
        ],
      })

      const message = component.build_message({
        components: [
          header_component,
          ...history_components,
          footer_component,
        ],
      })

      await interaction.editReply(message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "history_live_command", {})
      await interaction.editReply({
        content : "An error occurred while fetching live history.",
      }).catch(() => {})
    }
  },
}
