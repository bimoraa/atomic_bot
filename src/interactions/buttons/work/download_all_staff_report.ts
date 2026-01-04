import { ButtonInteraction } from "discord.js"
import { db } from "../../../utils"

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
  total_work_this_week : number
  total_salary         : number
  salary_this_week     : number
}

export async function handle_download_all_staff_report(interaction: ButtonInteraction): Promise<void> {
  const [_, week_str, year_str] = interaction.customId.split(":")
  const week_number             = parseInt(week_str, 10)
  const year                    = parseInt(year_str, 10)

  await interaction.deferUpdate()

  const all_reports = await db.find_many<WorkReport>("work_reports", { week_number, year })
  const all_logs    = await db.find_many<WorkLog>("work_logs", { week_number, year })

  if (all_reports.length === 0) {
    await interaction.followUp({
      content   : "No work data found for this week",
      ephemeral : true,
    })
    return
  }

  const staff_details = new Map<string, {
    staff_name           : string
    tickets              : number
    whitelists           : number
    total_works          : number
    ticket_salary        : number
    whitelist_salary     : number
    total_salary_week    : number
    total_work_all_time  : number
    total_salary_all_time: number
  }>()

  for (const report of all_reports) {
    const staff_logs       = all_logs.filter(log => log.staff_id === report.staff_id)
    const tickets          = staff_logs.filter(log => log.type === "ticket").length
    const whitelists       = staff_logs.filter(log => log.type === "whitelist").length
    const ticket_salary    = tickets * 2500
    const whitelist_salary = whitelists * 1500

    staff_details.set(report.staff_id, {
      staff_name           : report.staff_name || "Unknown",
      tickets,
      whitelists,
      total_works          : tickets + whitelists,
      ticket_salary,
      whitelist_salary,
      total_salary_week    : ticket_salary + whitelist_salary,
      total_work_all_time  : report.total_work,
      total_salary_all_time: Number(report.total_salary),
    })
  }

  const sorted_staff = Array.from(staff_details.entries())
    .sort((a, b) => b[1].total_works - a[1].total_works)

  let csv = "Rank,Staff Name,Staff ID,Tickets,Whitelists,Total Works Week,Ticket Salary,Whitelist Salary,Total Salary Week,Total Works All Time,Total Salary All Time\n"

  sorted_staff.forEach(([staff_id, details], index) => {
    const rank = index + 1
    csv += `${rank},`
    csv += `"${details.staff_name}",`
    csv += `${staff_id},`
    csv += `${details.tickets},`
    csv += `${details.whitelists},`
    csv += `${details.total_works},`
    csv += `${details.ticket_salary},`
    csv += `${details.whitelist_salary},`
    csv += `${details.total_salary_week},`
    csv += `${details.total_work_all_time},`
    csv += `${details.total_salary_all_time}\n`
  })

  const total_tickets           = sorted_staff.reduce((sum, [_, d]) => sum + d.tickets, 0)
  const total_whitelists        = sorted_staff.reduce((sum, [_, d]) => sum + d.whitelists, 0)
  const total_works_week        = sorted_staff.reduce((sum, [_, d]) => sum + d.total_works, 0)
  const total_ticket_salary     = sorted_staff.reduce((sum, [_, d]) => sum + d.ticket_salary, 0)
  const total_whitelist_salary  = sorted_staff.reduce((sum, [_, d]) => sum + d.whitelist_salary, 0)
  const total_salary_week       = sorted_staff.reduce((sum, [_, d]) => sum + d.total_salary_week, 0)

  csv += `\n`
  csv += `TOTAL,${sorted_staff.length} Staff,`,
  csv += `-,`
  csv += `${total_tickets},`
  csv += `${total_whitelists},`
  csv += `${total_works_week},`
  csv += `${total_ticket_salary},`
  csv += `${total_whitelist_salary},`
  csv += `${total_salary_week},`
  csv += `-,-\n`

  const filename = `all_staff_work_week${week_number}_${year}.csv`
  const buffer   = Buffer.from(csv, "utf-8")

  await interaction.followUp({
    content   : `**Work Report Week ${week_number} - ${year}**\n\n**Summary:**\n- Total Staff: ${sorted_staff.length}\n- Total Tickets: ${total_tickets}\n- Total Whitelists: ${total_whitelists}\n- Total Works: ${total_works_week}\n- Total Salary: Rp ${total_salary_week.toLocaleString("id-ID")}`,
    files     : [{ attachment: buffer, name: filename }],
    ephemeral : true,
  })
}
