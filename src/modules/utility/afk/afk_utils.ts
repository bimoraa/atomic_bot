import { component } from "../../../shared/utils"

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
