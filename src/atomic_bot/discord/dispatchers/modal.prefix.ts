/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 模态框前缀匹配分发表 — customId 前缀映射到处理器 - \\
// - prefix-match modal dispatch table — maps customId prefix to handler - \\
import { ModalSubmitInteraction } from "discord.js"
import { get_modal_module }       from "@discord/interaction-registry"
import { ModalHandler }           from "@discord/dispatchers/modal.exact"

export type ModalPrefixEntry = readonly [prefix: string, handler: ModalHandler]

// - 加载所需模态框模块 - \\
// - load required modal modules - \\
const server_modal = get_modal_module("server")

/**
 * @description prefix-match array for modal submit interactions — checked via startsWith
 * @returns {ModalPrefixEntry[]}
 */
export const modal_prefix: ModalPrefixEntry[] = [
  ["edit_rules:", (i) => server_modal.handle_edit_rules_modal(i)],
]
