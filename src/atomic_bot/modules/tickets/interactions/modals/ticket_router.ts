import { ModalHandler } from "@shared/types/interaction"
import { handle_ticket_modal } from "@shared/database/unified_ticket/controllers/ticket_controller"
import { ModalSubmitInteraction } from "discord.js"

export const modal: ModalHandler = {
  custom_id: /^(.*_close_reason_modal|.*_issue_modal|.*_application_modal|.*_modal_.*)$/,
  async execute(interaction: ModalSubmitInteraction) {
    await handle_ticket_modal(interaction)
  }
}