import { ButtonInteraction }            from "discord.js"
import { db, component }                from "../../../utils"
import { format_salary }                from "../../../services/work_tracker"
import { get_week_date_range }          from "../../select_menus/work_stats/year_select"

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

  const all_logs = await db.find_many<WorkLog>("work_logs", { week_number, year })

  if (all_logs.length === 0) {
    await interaction.followUp({
      content   : "No work data found for this week",
      ephemeral : true,
    })
    return
  }

  const staff_map = new Map<string, {
    staff_name           : string
    tickets              : number
    whitelists           : number
    total_works          : number
    ticket_salary        : number
    whitelist_salary     : number
    total_salary_week    : number
  }>()

  for (const log of all_logs) {
    if (!staff_map.has(log.staff_id)) {
      staff_map.set(log.staff_id, {
        staff_name        : log.staff_name || "Unknown",
        tickets           : 0,
        whitelists        : 0,
        total_works       : 0,
        ticket_salary     : 0,
        whitelist_salary  : 0,
        total_salary_week : 0,
      })
    }

    const staff = staff_map.get(log.staff_id)!
    
    if (log.type === "ticket") {
      staff.tickets++
      staff.ticket_salary += 2500
    } else if (log.type === "whitelist") {
      staff.whitelists++
      staff.whitelist_salary += 1500
    }
    
    staff.total_works++
    staff.total_salary_week += Number(log.salary)
  }

  const all_reports = await db.find_many<WorkReport>("work_reports", {})
  const report_map  = new Map(all_reports.map(r => [r.staff_id, r]))

  const sorted_staff = Array.from(staff_map.entries())
    .sort((a, b) => b[1].total_works - a[1].total_works)

  let csv = "Rank,Staff Name,Staff ID,Tickets,Whitelists,Total Works Week,Ticket Salary,Whitelist Salary,Total Salary Week,Total Works All Time,Total Salary All Time\n"

  sorted_staff.forEach(([staff_id, details], index) => {
    const rank          = index + 1
    const total_report  = report_map.get(staff_id)
    
    csv += `${rank},`
    csv += `"${details.staff_name}",`
    csv += `${staff_id},`
    csv += `${details.tickets},`
    csv += `${details.whitelists},`
    csv += `${details.total_works},`
    csv += `${details.ticket_salary},`
    csv += `${details.whitelist_salary},`
    csv += `${details.total_salary_week},`
    csv += `${total_report?.total_work || 0},`
    csv += `${total_report?.total_salary || 0}\n`
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

  const week_range = get_week_date_range(year, week_number)

  const upload_response = await interaction.followUp({
    files     : [{ attachment: buffer, name: filename }],
    ephemeral : true,
  })

  const file_url = upload_response.attachments.first()?.url

  if (!file_url) {
    await interaction.followUp({
      content   : "Failed to upload CSV file",
      ephemeral : true,
    })
    return
  }

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`**WORK REPORT DOWNLOADED**`),
          component.text(`Week ${week_number} - ${year}`),
          component.text(`Period: ${week_range.start} - ${week_range.end}`),
          component.text(`Total Staff: **${sorted_staff.length}**`),
          component.text(`Total Tickets: **${total_tickets}** | Whitelists: **${total_whitelists}**`),
          component.text(`Total Works: **${total_works_week}**`),
          component.text(`Total Salary: **${format_salary(total_salary_week)}**`),
        ],
      }),
      component.file(file_url) as any,
    ],
  })

  await interaction.followUp({
    ...message,
    ephemeral : true,
  })
}
