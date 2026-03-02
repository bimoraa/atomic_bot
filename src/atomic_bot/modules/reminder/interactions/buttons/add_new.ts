// - 新增提醒按钮的交互注册 - \
// - registers the add new reminder button interaction - \
import { ButtonInteraction } from "discord.js"
import { modal }             from "@shared/utils"
import { ButtonHandler }     from "@shared/types/interaction"

export async function handle_reminder_add_new(interaction: ButtonInteraction): Promise<void> {
  const reminder_modal = modal.create_modal(
    "reminder_add_new_modal",
    "Create New Reminder",
    modal.create_text_input({
      custom_id  : "reminder_minutes",
      label      : "Minutes Until Reminder",
      style      : "short",
      placeholder: "Enter minutes (1-10080)",
      required   : true,
      max_length : 5,
    }),
    modal.create_text_input({
      custom_id  : "reminder_note",
      label      : "Reminder Message",
      style      : "paragraph",
      placeholder: "Enter your reminder note",
      required   : true,
      max_length : 500,
    })
  )

  await interaction.showModal(reminder_modal)
}

export const button: ButtonHandler = {
  custom_id: "reminder_add_new",
  execute: handle_reminder_add_new,
}
