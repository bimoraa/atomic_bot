import { component } from "@shared/utils"

/**
 * - BUILD SIMPLE MESSAGE - \\
 * @param {string} title - Message title
 * @param {string[]} lines - Message lines
 * @returns {object} Component v2 message
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
 * - SANITIZE AFK REASON - \\
 * @param {string} reason - Raw AFK reason from user input
 * @returns {string} Sanitized AFK reason
 */
export function sanitize_afk_reason(reason: string): string {
  // - REMOVE INVISIBLE/ZERO-WIDTH CHARACTERS - \\
  const invisible_chars = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g
  let sanitized         = reason.replace(invisible_chars, "")

  // - REPLACE NEWLINES AND TABS WITH SPACES - \\
  sanitized = sanitized.replace(/[\n\r\t]+/g, " ")

  // - COLLAPSE MULTIPLE SPACES - \\
  sanitized = sanitized.replace(/\s+/g, " ")

  // - TRIM WHITESPACE - \\
  sanitized = sanitized.trim()

  // - LIMIT LENGTH TO 200 CHARACTERS - \\
  const max_length = 200
  if (sanitized.length > max_length) {
    sanitized = sanitized.substring(0, max_length).trim() + "..."
  }

  // - PREVENT EMPTY/WHITESPACE-ONLY MESSAGES - \\
  if (!sanitized || sanitized.length === 0) {
    sanitized = "AFK"
  }

  return sanitized
}
