/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 票务选择菜单路由，根据类型分发到对应处理器 - \
// - ticket select menu router, dispatches to the right handler based on ticket type - \
import { StringSelectMenuHandler } from "@shared/types/interaction"
import { handle_ticket_select_menu } from "@shared/database/unified_ticket/controllers/ticket_controller"
import { StringSelectMenuInteraction } from "discord.js"

export const string_select: StringSelectMenuHandler = {
  custom_id: /^(.*_select)$/,
  async execute(interaction: StringSelectMenuInteraction) {
    await handle_ticket_select_menu(interaction)
  }
}