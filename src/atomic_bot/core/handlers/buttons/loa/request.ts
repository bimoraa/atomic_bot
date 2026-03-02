import { ButtonInteraction } from "discord.js"
import { modal }             from "@shared/utils"

export async function handle_loa_request(interaction: ButtonInteraction): Promise<void> {
  const loa_modal = modal.create_modal(
    "loa_request_modal",
    "Request Leave of Absence",
    modal.create_text_input({
      custom_id  : "loa_end_date",
      label      : "End Date (YYYY-MM-DD)",
      style      : "short",
      placeholder: "e.g., 2025-12-31",
      required   : true,
      max_length : 10,
    }),
    modal.create_text_input({
      custom_id  : "loa_type",
      label      : "Type of Leave",
      style      : "short",
      placeholder: "e.g., Vacation, Sick Leave, Personal",
      required   : true,
      max_length : 100,
    }),
    modal.create_text_input({
      custom_id  : "loa_reason",
      label      : "Reason",
      style      : "paragraph",
      placeholder: "Enter your reason for leave",
      required   : true,
      max_length : 500,
    })
  )

  await interaction.showModal(loa_modal)
}
