import { StringSelectMenuInteraction } from "discord.js"
import { component, db } from "../../../utils"
import { format_salary } from "../../../services/work_tracker"

interface WorkLog {
  staff_id    : string
  staff_name  : string
  type        : string
  salary      : number
  week_number : number
  year        : number
}

interface WorkReport {
  staff_id             : string
  staff_name           : string
  total_work           : number
  total_salary         : number
}

export async function handle_all_staff_work_week_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const [year_str, week_str] = interaction.values[0].split(":")
  const year                 = parseInt(year_str, 10)
  const week_number          = parseInt(week_str, 10)

  await interaction.deferUpdate()

  const all_logs = await db.find_many<WorkLog>("work_logs", { week_number, year })

  if (all_logs.length === 0) {
    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`No work logs found for Week ${week_number} - ${year}`),
          ],
        }),
      ],
    })

    await interaction.editReply(error_message)
    return
  }

  const staff_map = new Map<string, {
    staff_name   : string
    tickets      : number
    whitelists   : number
    total_works  : number
    total_salary : number
  }>()

  for (const log of all_logs) {
    if (!staff_map.has(log.staff_id)) {
      staff_map.set(log.staff_id, {
        staff_name   : log.staff_name || "Unknown",
        tickets      : 0,
        whitelists   : 0,
        total_works  : 0,
        total_salary : 0,
      })
    }

    const staff = staff_map.get(log.staff_id)!
    
    if (log.type === "ticket") {
      staff.tickets++
    } else if (log.type === "whitelist") {
      staff.whitelists++
    }
    
    staff.total_works++
    staff.total_salary += Number(log.salary)
  }

  const sorted_staff = Array.from(staff_map.entries())
    .sort((a, b) => b[1].total_works - a[1].total_works)

  const all_reports = await db.find_many<WorkReport>("work_reports", {})
  const report_map = new Map(all_reports.map(r => [r.staff_id, r]))

  let report_text = `ALL STAFF WORK REPORT\\n`
  report_text += `WEEK ${week_number} - ${year}\\n`
  report_text += `${"-".repeat(60)}\\n\\n`

  sorted_staff.forEach(([staff_id, data], index) => {
    const rank          = index + 1
    const total_report  = report_map.get(staff_id)
    const total_works   = total_report?.total_work || 0
    const total_salary  = total_report?.total_salary || 0
    
    report_text += `${rank}. ${data.staff_name} (@${staff_id})\\n`
    report_text += `   - This Week: ${data.total_works} works (${data.tickets} tickets, ${data.whitelists} whitelists) | ${format_salary(data.total_salary)}\\n`
    report_text += `   - Total All Time: ${total_works} works | ${format_salary(total_salary)}\\n\\n`
  })

  const total_works_week   = sorted_staff.reduce((sum, [_, d]) => sum + d.total_works, 0)
  const total_salary_week  = sorted_staff.reduce((sum, [_, d]) => sum + d.total_salary, 0)
  const total_tickets      = sorted_staff.reduce((sum, [_, d]) => sum + d.tickets, 0)
  const total_whitelists   = sorted_staff.reduce((sum, [_, d]) => sum + d.whitelists, 0)

  report_text += `${"-".repeat(60)}\\n`
  report_text += `TOTAL STAFF: ${sorted_staff.length}\\n`
  report_text += `TOTAL TICKETS: ${total_tickets}\\n`
  report_text += `TOTAL WHITELISTS: ${total_whitelists}\\n`
  report_text += `TOTAL WORKS: ${total_works_week}\\n`
  report_text += `TOTAL SALARY: ${format_salary(total_salary_week)}\\n`

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`**ALL STAFF WORK REPORT**`),
          component.text(`Week ${week_number} - ${year}`),
          component.text(`Total Staff: **${sorted_staff.length}**`),
          component.text(`Total Tickets: **${total_tickets}** | Whitelists: **${total_whitelists}**`),
          component.text(`Total Works: **${total_works_week}**`),
          component.text(`Total Salary: **${format_salary(total_salary_week)}**`),
        ],
      }),
      component.action_row(
        component.primary_button("Download CSV", `download_all_staff_report:${week_number}:${year}`)
      ),
    ],
  })

  await interaction.editReply(message)
}
