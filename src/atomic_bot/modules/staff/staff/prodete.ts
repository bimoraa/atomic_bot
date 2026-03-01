import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command }                   from "@shared/types/command"
import { component, format, logger } from "@shared/utils"
import { is_admin }                   from "@shared/database/settings/permissions"
import {
  build_prodete_report,
  get_prodete_report_by_dates,
  type prodete_entry,
  type prodete_report,
} from "@shared/controllers/prodete_controller"

const __web_base_url = process.env.WEB_URL || "https://maxime.up.railway.app"
const __date_regex   = /^\d{2}-\d{2}-\d{4}$/
const log            = logger.create_logger("prodete")

/**
 * Formats a number with thousands separator.
 * @param n number
 * @returns formatted string
 */
function fmt_num(n: number): string {
  return n.toLocaleString("en-US")
}

/**
 * Pads a string to a fixed width for table alignment.
 * @param s    string to pad
 * @param len  target length
 * @returns padded string
 */
function pad(s: string | number, len: number): string {
  return String(s).padEnd(len)
}

/**
 * Builds the text table for the ProDeTe report (top N staff).
 * @param entries sorted prodete_entry array
 * @param limit   max rows to show
 * @returns formatted code block string
 */
function build_table(entries: prodete_entry[], limit = 20): string {
  const rows = entries.slice(0, limit)

  const header = `${pad("#", 4)}${pad("Staff", 22)}${pad("Msg", 8)}${pad("Claim", 8)}${pad("Ask", 7)}${pad("Total", 8)}%`
  const sep    = "─".repeat(header.length)

  const lines = rows.map(e =>
    `${pad(e.rank, 4)}${pad(e.username.slice(0, 20), 22)}${pad(fmt_num(e.msg_count), 8)}${pad(fmt_num(e.claim_count), 8)}${pad(fmt_num(e.answer_count), 7)}${pad(fmt_num(e.total), 8)}${e.percentage}%`
  )

  return format.code_block([header, sep, ...lines].join("\n"), "")
}

/**
 * Validates a "DD-MM-YYYY" date string.
 * @param s input string
 * @returns true if valid
 */
function is_valid_date(s: string): boolean {
  if (!__date_regex.test(s)) return false

  const [day, month, year] = s.split("-").map(Number)

  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31)     return false
  if (year < 2020)             return false

  return true
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("prodete")
    .setDescription("generate activity report for a date range")
    .addStringOption(opt =>
      opt.setName("from")
        .setDescription("Start date (DD-MM-YYYY), e.g. 01-02-2026")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("to")
        .setDescription("End date (DD-MM-YYYY), e.g. 28-02-2026")
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName("refresh")
        .setDescription("Force regenerate even if report already exists (default: false)")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true })
      return
    }

    const from_date = interaction.options.getString("from", true).trim()
    const to_date   = interaction.options.getString("to",   true).trim()
    const refresh   = interaction.options.getBoolean("refresh") ?? false

    if (!is_valid_date(from_date) || !is_valid_date(to_date)) {
      await interaction.reply({
        content  : "Invalid date format. Use DD-MM-YYYY (e.g. `01-02-2026`).",
        ephemeral: true,
      })
      return
    }

    // - VALIDATE RANGE ORDER - \\
    const [fd, fm, fy] = from_date.split("-").map(Number)
    const [td, tm, ty] = to_date.split("-").map(Number)
    const from_ms     = Date.UTC(fy, fm - 1, fd)
    const to_ms       = Date.UTC(ty, tm - 1, td)

    if (from_ms > to_ms) {
      await interaction.reply({
        content  : "Start date must be before or equal to end date.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: false })

    // - USE CACHED REPORT IF EXISTS AND NOT FORCING REFRESH - \\
    if (!refresh) {
      const cached = await get_prodete_report_by_dates(from_date, to_date)
      if (cached) {
        const table    = build_table(cached.entries)
        const page_url = `${__web_base_url}/data/prodete/${cached.slug}`

        const msg = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `## ProDeTe — Data Keaktifan Staff`,
                  `**Period:** ${from_date} – ${to_date}`,
                  `**Staff counted:** ${cached.entries.length}`,
                  `*Report already exists — use \`refresh: true\` to regenerate.*`,
                ]),
                component.divider(),
                component.text(table),
                component.divider(),
                component.action_row(
                  component.link_button("View Full Report", page_url)
                ),
              ],
            }),
          ],
        })

        await interaction.editReply(msg)
        return
      }
    }

    const guild_id = interaction.guildId!

    // - NOTIFY USER THAT GENERATION IS STARTING (CAN TAKE MINUTES) - \\
    const progress_msg = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## ProDeTe — Generating Report`,
              `**Period:** ${from_date} – ${to_date}`,
              `Counting messages in ${__msg_channels_count} channels and querying ticket claims...`,
              `*This may take several minutes.*`,
            ]),
          ],
        }),
      ],
    })

    await interaction.editReply(progress_msg)

    // - THROTTLED PROGRESS EDITS (MAX 1 PER 3s TO AVOID RATE LIMITS) - \\
    let last_progress_edit = Date.now()

    const on_progress = async (message: string, done: number, total: number): Promise<void> => {
      const now = Date.now()
      if (now - last_progress_edit < 3000) return
      last_progress_edit = now

      const pct     = Math.round((done / total) * 100)
      const filled  = Math.floor(pct / 10)
      const bar     = "\u2588".repeat(filled) + "\u2591".repeat(10 - filled)

      const upd = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## ProDeTe \u2014 Generating Report`,
                `**Period:** ${from_date} \u2013 ${to_date}`,
                `\`[${bar}]\` ${pct}% \u2014 ${message}`,
                `*Please wait...*`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(upd).catch(() => {})
    }

    try {
      const report = await build_prodete_report(
        interaction.client,
        guild_id,
        from_date,
        to_date,
        interaction.user.id,
        on_progress
      )

      const table    = build_table(report.entries)
      const page_url = `${__web_base_url}/data/prodete/${report.slug}`

      const result_msg = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## ProDeTe — Data Keaktifan Staff`,
                `**Period:** ${from_date} – ${to_date}`,
                `**Staff counted:** ${report.entries.length}`,
                `**Generated:** <t:${Math.floor(report.generated_at / 1000)}:R>`,
              ]),
              component.divider(),
              component.text(table),
              component.divider(),
              component.action_row(
                component.link_button("View Full Report", page_url)
              ),
            ],
          }),
        ],
      })

      await interaction.editReply(result_msg)
    } catch (err) {
      log.error(`ProDeTe command failed: ${(err as Error).message}`)
      await interaction.editReply({
        content: `Failed to generate report: ${(err as Error).message}`,
      })
    }
  },
}

// - CHANNEL COUNT FOR PROGRESS MESSAGE - \\
const __msg_channels_count = 6

export default command
