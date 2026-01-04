import { StringSelectMenuInteraction } from "discord.js"
import { component } from "../../../utils"

function get_current_week_and_year(): { week: number; year: number } {
  const now           = new Date()
  const start_of_year = new Date(now.getFullYear(), 0, 1)
  const days          = Math.floor((now.getTime() - start_of_year.getTime()) / (24 * 60 * 60 * 1000))
  const week          = Math.ceil((days + start_of_year.getDay() + 1) / 7)
  
  return { week, year: now.getFullYear() }
}

export async function handle_all_staff_work_year_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const year = parseInt(interaction.values[0], 10)

  await interaction.deferUpdate()

  const current           = get_current_week_and_year()
  const is_current_year   = year === current.year
  const max_week          = is_current_year ? current.week : 52
  const week_options      = []

  for (let week = 1; week <= max_week; week++) {
    const is_current = is_current_year && week === current.week
    week_options.push({
      label : is_current ? `Week ${week} (CURRENT)` : `Week ${week}`,
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
