import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command } from "../../../shared/types/command"
import { component } from "../../../shared/utils"
import { get_week_number } from "../../../shared/database/trackers/work_tracker"

const __admin_role_id = "1277272542914281512"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("work-stats")
    .setDescription("Check staff work statistics")
    .addUserOption(opt =>
      opt.setName("staff")
        .setDescription("Staff member to check (admin only, leave empty for self)")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member       = interaction.member as GuildMember
    const is_admin     = member.roles.cache.has(__admin_role_id)
    const staff_input  = interaction.options.getUser("staff")
    const staff        = staff_input || interaction.user

    if (!is_admin && staff.id !== interaction.user.id) {
      await interaction.reply({ content: "You can only check your own work stats.", ephemeral: true })
      return
    }

    const current_week  = get_week_number()
    const week_options  = []

    for (let i = current_week; i >= 1 && i > current_week - 8; i--) {
      week_options.push({
        label:       `Week ${i}${i === current_week ? " (Current)" : ""}`,
        value:       `${staff.id}:${i}`,
        description: i === current_week ? "Current week" : undefined,
      })
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`Select a week to view work stats for **${staff.username}**:`),
            component.select_menu("work_stats_week_select", "Select week", week_options),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...message,
      ephemeral: true,
    })
  },
}

export default command
