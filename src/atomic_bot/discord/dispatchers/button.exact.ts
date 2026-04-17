/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 按钮精确匹配分发表 — 精确 customId 映射到处理器 - \\
// - exact-match button dispatch table — maps exact customId to handler - \\
import { ButtonInteraction, Client } from "discord.js"
import { get_button_module }         from "@discord/interaction-registry"

export type ButtonHandler = (i: ButtonInteraction, c: Client) => Promise<any>

// - 加载所需按钮模块 - \\
// - load required button modules - \\
const ask_buttons            = get_button_module("ask")
const close_request_buttons  = get_button_module("close-request")
const community_buttons      = get_button_module("community")
const free_scripts_buttons   = get_button_module("free-scripts")
const loa_buttons            = get_button_module("loa")
const middleman_buttons      = get_button_module("middleman")
const music_buttons          = get_button_module("music")
const reminder_buttons       = get_button_module("reminder")
const scripts_buttons        = get_button_module("scripts")
const suggest_feature_buttons = get_button_module("suggest-feature")
const tempvoice_buttons      = get_button_module("tempvoice")
const cc_salary_buttons      = get_button_module("cc-salary")

/**
 * @description exact-match map for button interactions — keyed by full customId
 * @returns {Map<string, ButtonHandler>}
 */
export const button_exact = new Map<string, ButtonHandler>([
  ["midman_service_close_info",  (i) => middleman_buttons.handle_middleman_service_close_info(i)],
  ["review_submit",              (i) => community_buttons.handle_review_submit(i)],
  ["ask_staff_button",           (i) => ask_buttons.handle_ask_staff_button(i)],
  ["close_request_accept",       (i) => close_request_buttons.handle_close_request_accept(i)],
  ["close_request_deny",         (i) => close_request_buttons.handle_close_request_deny(i)],
  ["script_redeem_key",          (i) => scripts_buttons.handle_redeem_key(i)],
  ["script_get_script",          (i) => scripts_buttons.handle_get_script(i)],
  ["script_mobile_copy",         (i) => scripts_buttons.handle_mobile_copy(i)],
  ["script_get_role",            (i) => scripts_buttons.handle_get_role(i)],
  ["script_reset_hwid",          (i) => scripts_buttons.handle_reset_hwid(i)],
  ["script_get_stats",           (i) => scripts_buttons.handle_get_stats(i)],
  ["script_view_leaderboard",    (i) => scripts_buttons.handle_view_leaderboard(i)],
  ["free_get_script",            (i) => free_scripts_buttons.handle_free_get_script(i)],
  ["free_mobile_copy",           (i) => free_scripts_buttons.handle_free_mobile_copy(i)],
  ["free_reset_hwid",            (i) => free_scripts_buttons.handle_free_reset_hwid(i)],
  ["free_get_stats",             (i) => free_scripts_buttons.handle_free_get_stats(i)],
  ["free_leaderboard",           (i) => free_scripts_buttons.handle_free_leaderboard(i)],
  ["tempvoice_name",             (i) => tempvoice_buttons.handle_tempvoice_name(i)],
  ["tempvoice_limit",            (i) => tempvoice_buttons.handle_tempvoice_limit(i)],
  ["tempvoice_privacy",          (i) => tempvoice_buttons.handle_tempvoice_privacy(i)],
  ["tempvoice_waitingroom",      (i) => tempvoice_buttons.handle_tempvoice_waitingroom(i)],
  ["tempvoice_chat",             (i) => tempvoice_buttons.handle_tempvoice_chat(i)],
  ["tempvoice_trust",            (i) => tempvoice_buttons.handle_tempvoice_trust(i)],
  ["tempvoice_untrust",          (i) => tempvoice_buttons.handle_tempvoice_untrust(i)],
  ["tempvoice_invite",           (i) => tempvoice_buttons.handle_tempvoice_invite(i)],
  ["tempvoice_kick",             (i) => tempvoice_buttons.handle_tempvoice_kick(i)],
  ["tempvoice_region",           (i) => tempvoice_buttons.handle_tempvoice_region(i)],
  ["tempvoice_block",            (i) => tempvoice_buttons.handle_tempvoice_block(i)],
  ["tempvoice_unblock",          (i) => tempvoice_buttons.handle_tempvoice_unblock(i)],
  ["tempvoice_claim",            (i) => tempvoice_buttons.handle_tempvoice_claim(i)],
  ["tempvoice_transfer",         (i) => tempvoice_buttons.handle_tempvoice_transfer(i)],
  ["tempvoice_delete",           (i) => tempvoice_buttons.handle_tempvoice_delete(i)],
  ["tempvoice_leaderboard",      (i) => tempvoice_buttons.handle_tempvoice_leaderboard(i)],
  ["reminder_add_new",           (i) => reminder_buttons.handle_reminder_add_new(i)],
  ["reminder_list",              (i) => reminder_buttons.handle_reminder_list(i)],
  ["reminder_cancel_select",     (i) => reminder_buttons.handle_reminder_cancel(i)],
  ["loa_request",                (i) => loa_buttons.handle_loa_request(i)],
  ["loa_approve",                (i) => loa_buttons.handle_loa_approve(i)],
  ["loa_reject",                 (i) => loa_buttons.handle_loa_reject(i)],
  ["loa_end",                    (i) => loa_buttons.handle_loa_end(i)],
  ["music_skip",                 (i) => music_buttons.handle_music_skip(i)],
  ["music_pause_resume",         (i) => music_buttons.handle_music_pause_resume(i)],
  ["music_stop",                 (i) => music_buttons.handle_music_stop(i)],
  ["suggest_feature",            (i) => suggest_feature_buttons.handle_suggest_feature(i)],
  ["cc_check_earnings",          (i) => cc_salary_buttons.handle_cc_check_earnings(i)],
  ["cc_get_invite",              (i) => cc_salary_buttons.handle_cc_get_invite(i)],
  ["cc_view_invite_logs",        (i) => cc_salary_buttons.handle_cc_view_invite_logs(i)],
])
