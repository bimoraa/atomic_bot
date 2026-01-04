import { StringSelectMenuInteraction } from "discord.js"
import { component } from "../../../utils"

function get_iso_week(date: Date): { week: number; year: number } {
  const target       = new Date(date.valueOf())
  const day_number   = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - day_number + 3)
  const first_thursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const week_number = 1 + Math.ceil((first_thursday - target.valueOf()) / 604800000)
  
  return { week: week_number, year: target.getFullYear() }
}

export async function handle_all_staff_work_year_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const year = parseInt(interaction.values[0], 10)

  await interaction.deferUpdate()

  const current         = get_iso_week(new Date())
  const is_current_year = year === current.year
  const max_week        = is_current_year ? current.week : 52
  const week_options    = []

  for (let week = max_week; week >= 1; week--) {
    const is_current = is_current_year && week === current.week
    week_options.push({
      label : is_current ? `Week ${week} (CURRENT)` : `Week ${week}`,
      value : `${year}:${week}`,
    })
    
    if (week_options.length >= 25) break
  }

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`**SELECT WEEK - ${year}**`),
          component.text(`Showing ${week_options.length} most recent weeks`),
          component.text("ISO Week: Week 1 starts from the week containing first Thursday"),
        ],
      }),
      component.select_menu(
        "all_staff_work_week_select",
        "Select week",
        week_options
      ),
    ],
  })

  await interaction.editReply(message)
}
