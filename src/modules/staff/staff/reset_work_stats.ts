import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command } from "../../../shared/types/command"
import { component, db } from "../../../shared/utils"
import { WorkReport, WorkLog } from "../../../shared/database/trackers/work_tracker"

/**
 * - RECALCULATE WORK STATS FROM LOGS - \\
 */
const reset_work_stats: Command = {
  data: new SlashCommandBuilder()
    .setName("reset-work-stats")
    .setDescription("Recalculate work statistics from actual work logs")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to recalculate stats for")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true })

    const user = interaction.options.getUser("user", true)

    try {
      const existing_report = await db.find_one<WorkReport>("work_reports", { staff_id: user.id })

      if (!existing_report) {
        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## No Data Found",
                    `No work report found for <@${user.id}>`,
                  ]),
                ],
              }),
            ],
          })
        )
        return
      }

      const all_logs = await db.find_many<WorkLog>("work_logs", { staff_id: user.id })

      const ticket_count    = all_logs.filter(log => log.type === "ticket").length
      const whitelist_count = all_logs.filter(log => log.type === "whitelist").length
      const total_work      = all_logs.length
      
      const correct_total_salary = (ticket_count * 2500) + (whitelist_count * 1500)
      const old_total_salary     = existing_report.total_salary || 0

      await db.update_one(
        "work_reports",
        { staff_id: user.id },
        {
          total_work,
          total_salary: correct_total_salary,
        },
        false
      )

      await interaction.editReply(
        component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Work Stats Recalculated",
                  `Successfully recalculated stats for <@${user.id}>`,
                  ``,
                  `**Total Work:** ${total_work}`,
                  `- Tickets: ${ticket_count} (Rp ${new Intl.NumberFormat("id-ID").format(ticket_count * 2500)})`,
                  `- Whitelist: ${whitelist_count} (Rp ${new Intl.NumberFormat("id-ID").format(whitelist_count * 1500)})`,
                  ``,
                  `**Old Total Salary:** Rp ${new Intl.NumberFormat("id-ID").format(old_total_salary)}`,
                  `**New Total Salary:** Rp ${new Intl.NumberFormat("id-ID").format(correct_total_salary)}`,
                  ``,
                  old_total_salary !== correct_total_salary ? `**Difference:** Rp ${new Intl.NumberFormat("id-ID").format(Math.abs(old_total_salary - correct_total_salary))} ${old_total_salary > correct_total_salary ? "(decreased)" : "(increased)"}` : "No changes needed",
                ]),
              ],
            }),
          ],
        })
      )
    } catch (error) {
      console.error("[ - RESET WORK STATS - ] Error:", error)
      await interaction.editReply(
        component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Error",
                  "Failed to recalculate work stats. Please try again.",
                ]),
              ],
            }),
          ],
        })
      )
    }
  },
}

export default reset_work_stats
