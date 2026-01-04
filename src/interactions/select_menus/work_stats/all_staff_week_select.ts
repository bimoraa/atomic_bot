import { StringSelectMenuInteraction } from "discord.js"
import { component, db } from "../../../utils"
import { format_salary } from "../../../services/work_tracker"

interface WorkReport {
  staff_id             : string
  staff_name           : string
  total_work           : number
  total_work_this_week : number
  total_salary         : number
  salary_this_week     : number
  week_number          : number
  year                 : number
}

export async function handle_all_staff_work_week_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const [year_str, week_str] = interaction.values[0].split(":")
  const year                 = parseInt(year_str, 10)
  const week_number          = parseInt(week_str, 10)

  await interaction.deferUpdate()

  const all_reports = await db.find_many<WorkReport>("work_reports", { week_number, year })

  if (all_reports.length === 0) {
    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`No work reports found for Week ${week_number} - ${year}`),
          ],
        }),
      ],
    })

    await interaction.editReply(error_message)
    return
  }

  const sorted_reports = all_reports.sort((a, b) => b.total_work_this_week - a.total_work_this_week)

  let report_text = `ALL STAFF WORK REPORT\\n`
  report_text += `WEEK ${week_number} - ${year}\\n`
  report_text += `${"-".repeat(60)}\\n\\n`

  sorted_reports.forEach((report, index) => {
    const rank = index + 1
    report_text += `${rank}. ${report.staff_name || "Unknown"} (@${report.staff_id})\\n`
    report_text += `   - This Week: ${report.total_work_this_week} works | ${format_salary(report.salary_this_week)}\\n`
    report_text += `   - Total: ${report.total_work} works | ${format_salary(report.total_salary)}\\n\\n`
  })

  const total_works_this_week = sorted_reports.reduce((sum, r) => sum + r.total_work_this_week, 0)
  const total_salary_this_week = sorted_reports.reduce((sum, r) => sum + Number(r.salary_this_week), 0)

  report_text += `${"-".repeat(60)}\\n`
  report_text += `TOTAL STAFF: ${sorted_reports.length}\\n`
  report_text += `TOTAL WORKS THIS WEEK: ${total_works_this_week}\\n`
  report_text += `TOTAL SALARY THIS WEEK: ${format_salary(total_salary_this_week)}\\n`

  const filename = `all_staff_work_week${week_number}_${year}.txt`

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`**ALL STAFF WORK REPORT**`),
          component.text(`Week ${week_number} - ${year}`),
          component.text(`Total Staff: **${sorted_reports.length}**`),
          component.text(`Total Works: **${total_works_this_week}**`),
          component.text(`Total Salary: **${format_salary(total_salary_this_week)}**`),
        ],
      }),
      component.container({
        components: [
          component.primary_button("Download Report", `download_all_staff_report:${week_number}:${year}`),
        ],
      }),
    ],
  })

  await interaction.editReply(message)
}
