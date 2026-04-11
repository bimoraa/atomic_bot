/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 模态框精确匹配分发表 — 精确 customId 映射到处理器 - \\
// - exact-match modal dispatch table — maps exact customId to handler - \\
import { ModalSubmitInteraction } from "discord.js"
import { get_modal_module }       from "@discord/interaction-registry"

export type ModalHandler = (i: ModalSubmitInteraction) => Promise<any>

// - 加载所需模态框模块 - \\
// - load required modal modules - \\
const ask_modal       = get_modal_module("ask")
const community_modal = get_modal_module("community")

/**
 * @description exact-match map for modal submit interactions — keyed by full customId
 * @returns {Map<string, ModalHandler>}
 */
export const modal_exact = new Map<string, ModalHandler>([
  ["review_modal",    (i) => community_modal.handle_review_modal(i)],
  ["ask_staff_modal", (i) => ask_modal.handle_ask_staff_modal(i)],
])
