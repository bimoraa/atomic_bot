/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 选择菜单精确匹配分发表 — 精确 customId 映射到处理器 - \\
// - exact-match select menu dispatch table — maps exact customId to handler - \\
import { StringSelectMenuInteraction }    from "discord.js"
import { handle_role_permission_select }  from "@commands/server-util/utility/get_role_permission.commands"
import { get_select_menu_module }         from "@discord/interaction-registry"

export type SelectHandler = (i: StringSelectMenuInteraction) => Promise<any>

// - 加载所需选择菜单模块 - \\
// - load required select menu modules - \\
const guide_select      = get_select_menu_module("guide")
const middleman_select  = get_select_menu_module("middleman")
const reminder_select   = get_select_menu_module("reminder")
const staff_info_select = get_select_menu_module("staff-info")
const stats_select      = get_select_menu_module("stats")
const version_select    = get_select_menu_module("version")
const work_select       = get_select_menu_module("work")

/**
 * @description exact-match map for string select menu interactions — keyed by full customId
 * @returns {Map<string, SelectHandler>}
 */
export const select_exact = new Map<string, SelectHandler>([
  ["role_permission_select",             (i) => handle_role_permission_select(i, i.values[0])],
  ["answer_stats_select",                (i) => stats_select.handle_answer_stats_select(i)],
  ["payment_method_select",              (i) => stats_select.handle_payment_method_select(i)],
  ["guide_select",                       (i) => guide_select.handle_guide_select(i)],
  ["version_platform_select",            (i) => version_select.handle_version_platform_select(i)],
  ["work_stats_week_select",             (i) => work_select.handle_work_stats_week_select(i)],
  ["all_staff_work_year_select",         (i) => work_select.handle_all_staff_work_year_select(i)],
  ["all_staff_work_week_select",         (i) => work_select.handle_all_staff_work_week_select(i)],
  ["reminder_cancel_select",             (i) => reminder_select.handle_reminder_cancel_select(i)],
  ["middleman_transaction_range_select", (i) => middleman_select.handle_middleman_transaction_range_select(i)],
  ["staff_info_lang_select",             (i) => staff_info_select.handle_staff_info_lang_select(i)],
])
