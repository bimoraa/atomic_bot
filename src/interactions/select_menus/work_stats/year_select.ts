import { StringSelectMenuInteraction } from "discord.js"
import { component } from "../../../utils"

export async function handle_all_staff_work_year_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const year = parseInt(interaction.values[0], 10)

  await interaction.deferUpdate()

  const weeks_in_year = 52
  const week_options  = []

  for (let week = 1; week <= weeks_in_year; week++) {
    week_options.push({
      label : `Week ${week}`,
      value : `${year}:${week}`,
    })
  }

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`**SELECT WEEK - ${year}**`),
          component.text("Choose the week to view all staff work reports"),
        ],
      }),
      component.container({
        components: [
          component.select_menu(
            "all_staff_work_week_select",
            "Select week",
            week_options.slice(0, 25)
          ),
        ],
      }),
    ],
  })

  await interaction.editReply(message)
}
