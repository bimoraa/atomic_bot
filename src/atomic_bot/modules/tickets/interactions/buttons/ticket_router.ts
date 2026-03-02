// - 票务按钮路由，根据类型分发到对应处理器 - \
// - ticket button router, dispatches to the right handler based on ticket type - \
import { ButtonHandler } from "@shared/types/interaction"
import { handle_ticket_button } from "@shared/database/unified_ticket/controllers/ticket_controller"
import { ButtonInteraction } from "discord.js"

export const button: ButtonHandler = {
  custom_id: /^(.*_open|.*_close|.*_close_reason|.*_claim|.*_join_.*|.*_reopen|.*_add_member)$/,
  async execute(interaction: ButtonInteraction) {
    await handle_ticket_button(interaction)
  }
}