import { StringSelectMenuInteraction } from "discord.js"
import { api, component } from "../../../../shared/utils"
import {
  get_work_report,
  get_work_logs,
  get_year,
  format_salary,
} from "../../../../shared/database/trackers/work_tracker"

export async function handle_work_stats_week_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const [staff_id, week_str] = interaction.values[0].split(":")
  const week_number          = parseInt(week_str, 10)
  const year                 = get_year()

  await interaction.deferUpdate()

  const staff = await interaction.client.users.fetch(staff_id).catch(() => null)
  if (!staff) {
    await interaction.editReply({
      content:    "Failed to fetch user data.",
      components: [],
    })
    return
  }

  const report = await get_work_report(staff_id)
  const logs   = await get_work_logs(staff_id, week_number, year)

  if (!report) {
    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`No work data found for <@${staff_id}>`),
          ],
        }),
      ],
    })

    await interaction.editReply({
      ...error_message,
    })
    return
  }

  const ticket_logs      = logs.filter(l => l.type === "ticket")
  const whitelist_logs   = logs.filter(l => l.type === "whitelist")
  const ticket_salary    = ticket_logs.length * 2500
  const whitelist_salary = whitelist_logs.length * 1500
  const week_salary      = ticket_salary + whitelist_salary

  let logs_txt = `WORK LOGS - ${staff.username} (@${staff.id})\n`
  logs_txt += `WEEK ${week_number} - ${year}\n`
  logs_txt += `${"-".repeat(50)}\n\n`

  logs.forEach((log) => {
    logs_txt += `${log.work_id}\n`
    logs_txt += `  - Date: ${log.date || "N/A"}\n`
    logs_txt += `  - Thread: ${log.thread_link}\n`
    logs_txt += `  - Type: ${log.type === "ticket" ? "Ticket" : "Whitelist"}\n`
    if (log.proof_link) {
      logs_txt += `  - Proof: ${log.proof_link}\n`
    }
    if (log.amount > 0) {
      logs_txt += `  - Amount: Rp ${new Intl.NumberFormat("id-ID").format(log.amount)}\n`
    }
    logs_txt += `  - Salary: ${format_salary(log.salary)}\n`
    logs_txt += `\n`
  })

  if (logs.length === 0) {
    logs_txt += "No work logs for this week.\n"
  }

  const filename             = `work_logs_${staff.username}_week${week_number}_${year}.txt`
  const total_salary_all_time = report.total_salary || 0

  const content = [
    `## Work Stats - ${staff.username}`,
    `### WEEK ${week_number} - ${year}`,
    ``,
    `**Summary:**`,
    `- Total Work (All Time): **${report.total_work || 0}**`,
    `- Work This Week: **${logs.length}**`,
    `- Tickets: **${ticket_logs.length}** (${format_salary(ticket_salary)})`,
    `- Whitelist: **${whitelist_logs.length}** (${format_salary(whitelist_salary)})`,
    ``,
    `**Salary:**`,
    `- This Week: **${format_salary(week_salary)}**`,
    `- Total (All Time): **${format_salary(total_salary_all_time)}**`,
  ].join("\n")

  await api.edit_deferred_reply_v2_with_file(
    interaction,
    [
      component.container({
        components: [
          component.section({
            content,
            thumbnail: staff.displayAvatarURL(),
          }),
          component.file(`attachment://${filename}`),
        ],
      }),
    ],
    logs_txt,
    filename
  )
}
