/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - utility functions for the afk feature - \\
import { component } from "@shared/utils"

/**
 * - build simple message - \\
 * @param {string} title - message title
 * @param {string[]} lines - message lines
 * @returns {object} component v2 message
 */
export function build_simple_message(title: string, lines: string[]): object {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([title, ...lines]),
        ],
      }),
    ],
  })
}

/**
 * - sanitize afk reason - \\
 * @param {string} reason - raw AFK reason from user input
 * @returns {string} sanitized AFK reason
 */
export function sanitize_afk_reason(reason: string): string {
  // - remove invisible/zero-width characters - \\
  const invisible_chars = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g
  let sanitized         = reason.replace(invisible_chars, "")

  // - replace newlines and tabs with spaces - \\
  sanitized = sanitized.replace(/[\n\r\t]+/g, " ")

  // - collapse multiple spaces - \\
  sanitized = sanitized.replace(/\s+/g, " ")

  // - trim whitespace - \\
  sanitized = sanitized.trim()

  // - limit length to 200 characters - \\
  const max_length = 200
  if (sanitized.length > max_length) {
    sanitized = sanitized.substring(0, max_length).trim() + "..."
  }

  // - prevent empty/whitespace-only messages - \\
  if (!sanitized || sanitized.length === 0) {
    sanitized = "AFK"
  }

  return sanitized
}
