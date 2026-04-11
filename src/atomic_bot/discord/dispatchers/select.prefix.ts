/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 选择菜单前缀匹配分发表 — customId 前缀映射到处理器 - \\
// - prefix-match select menu dispatch table — maps customId prefix to handler - \\
import { StringSelectMenuInteraction }          from "discord.js"
import { get_button_module, get_select_menu_module } from "@discord/interaction-registry"
import { SelectHandler }                        from "@discord/dispatchers/select.exact"

export type SelectPrefixEntry = readonly [prefix: string, handler: SelectHandler]

// - 加载所需模块 - \\
// - load required modules - \\
const account_tracker_select = get_select_menu_module("account-tracker")
const guide_select           = get_select_menu_module("guide")
const middleman_select       = get_select_menu_module("middleman")
const scripts_buttons        = get_button_module("scripts")
const share_settings_select  = get_select_menu_module("share-settings")

/**
 * @description prefix-match array for string select menu interactions — checked via startsWith
 * @returns {SelectPrefixEntry[]}
 */
export const select_prefix: SelectPrefixEntry[] = [
  ["guide_lang_",              (i) => guide_select.handle_guide_language_select(i)],
  ["script_update_select:",    (i) => scripts_buttons.handle_script_update_select(i)],
  ["middleman_fee_select:",    (i) => middleman_select.handle_middleman_fee_select(i)],
  ["share_settings_select:",   (i) => share_settings_select.handle_share_settings_select(i)],
  ["share_settings_pick_rod:", (i) => share_settings_select.handle_share_settings_picker(i)],
  ["share_settings_pick_skin:",(i) => share_settings_select.handle_share_settings_picker(i)],
  ["account_tracker_select:",  (i) => account_tracker_select.handle_account_tracker_select(i)],
]
