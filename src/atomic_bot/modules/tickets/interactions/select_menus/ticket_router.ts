import { StringSelectMenuHandler } from "@shared/types/interaction"
import { handle_ticket_select_menu } from "@shared/database/unified_ticket/controllers/ticket_controller"
import { StringSelectMenuInteraction } from "discord.js"

export const string_select: StringSelectMenuHandler = {
  custom_id: /^(.*_select)$/,
  async execute(interaction: StringSelectMenuInteraction) {
    await handle_ticket_select_menu(interaction)
  }
}