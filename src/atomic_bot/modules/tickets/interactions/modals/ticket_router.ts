/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 票务 modal 路由，根据类型分发到对应处理器 - \
// - ticket modal router, dispatches to the right handler based on ticket type - \
import { ModalHandler } from "@shared/types/interaction"
import { handle_ticket_modal } from "@shared/database/unified_ticket/controllers/ticket_controller"
import { ModalSubmitInteraction } from "discord.js"

export const modal: ModalHandler = {
  custom_id: /^(.*_close_reason_modal|.*_issue_modal|.*_application_modal|.*_modal_.*)$/,
  async execute(interaction: ModalSubmitInteraction) {
    await handle_ticket_modal(interaction)
  }
}