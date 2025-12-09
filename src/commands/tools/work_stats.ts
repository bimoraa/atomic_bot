import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command } from "../../types/command"
import { api, component } from "../../utils"
import {
  get_work_report,
  get_work_logs,
  get_week_number,
  get_year,
  format_salary,
} from "../../functions/work_tracker"

const ADMIN_ROLE_ID = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("work-stats")
    .setDescription("Check staff work statistics")
    .addUserOption(opt =>
      opt.setName("staff")
        .setDescription("Staff member to check (admin only, leave empty for self)")
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName("week")
        .setDescription("Week number (default: current week)")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const is_admin = member.roles.cache.has(ADMIN_ROLE_ID)

    await interaction.deferReply({ flags: 64 })

    const staff_input = interaction.options.getUser("staff")
    const staff = staff_input || interaction.user

    if (!is_admin && staff.id !== interaction.user.id) {
      await interaction.editReply({ content: "You can only check your own work stats." })
      return
    }

    const week_input  = interaction.options.getInteger("week")
    const week_number = week_input || get_week_number()
    const year        = get_year()

    const report = await get_work_report(staff.id)
    const logs   = await get_work_logs(staff.id, week_number, year)

    if (!report) {
      await interaction.editReply({ content: `No work data found for <@${staff.id}>` })
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

    const filename = `work_logs_${staff.username}_week${week_number}_${year}.txt`

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
  },
}

export default command
