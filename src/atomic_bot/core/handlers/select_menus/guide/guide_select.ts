/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理指南选择菜单的选项 - \
// - handles the guide select menu selection - \
import { StringSelectMenuInteraction, TextChannel } from "discord.js"
import { component, api }                           from "@shared/utils"
import { guide_buttons, ParsedButton }              from "../../../../modules/setup/commands/guide_panel"
import fs                                           from "fs"
import path                                         from "path"

function load_guide(name: string): string | null {
  const guide_path = path.join(process.cwd(), "src/atomic_bot/guide", `${name}.md`)
  if (!fs.existsSync(guide_path)) return null
  return fs.readFileSync(guide_path, "utf-8")
}

function parse_buttons(content: string): { cleaned: string; buttons: ParsedButton[] } {
  const buttons: ParsedButton[] = []
  const button_regex            = /kiara:make_button\("([^"]+)",\s*"([\s\S]*?)"\);/g

  const cleaned = content.replace(button_regex, (_, title, button_content) => {
    buttons.push({
      title:   title.trim(),
      content: button_content.trim(),
    })
    return ""
  })

  return { cleaned: cleaned.trim(), buttons }
}

function parse_guide_to_components(
  content: string,
  guide_type: string,
  buttons: ParsedButton[]
): (component.text_component | component.divider_component | component.action_row_component)[] {
  const sections   = content.split(/\n---\n/)
  const components: (component.text_component | component.divider_component | component.action_row_component)[] = []

  sections.forEach((section, index) => {
    const trimmed = section.trim()
    if (trimmed) {
      components.push(component.text(trimmed))
    }
    if (index < sections.length - 1) {
      components.push(component.divider(2))
    }
  })

  if (buttons.length > 0) {
    components.push(component.divider(2))
    const button_components = buttons.map((btn, idx) =>
      component.secondary_button(btn.title, `guide_btn_${guide_type}_${idx}`)
    )
    components.push(component.action_row(...button_components))
  }

  return components
}

export async function handle_guide_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const selected = interaction.values[0]

  await interaction.deferReply({ flags: 32832 } as any)

  try {
    const guide_content = load_guide(selected)

    if (!guide_content) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [component.text("Guide not found.")],
          }),
        ],
      }))
      return
    }

    const { cleaned, buttons }  = parse_buttons(guide_content)
    guide_buttons.set(selected, buttons)
    const guide_components      = parse_guide_to_components(cleaned, selected, buttons)

    const result = await api.edit_deferred_reply(interaction, {
      flags:      32832,
      components: [{ type: 17, components: guide_components }],
    } as any)

    if (result.error) {
      console.error(`[ - GUIDE SELECT - ] Failed to send guide (${selected}):`, result)
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [component.text("Failed to load guide. Please try again.")],
          }),
        ],
      })).catch(() => {})
    }
  } catch (err) {
    console.error(`[ - GUIDE SELECT - ] Unexpected error:`, err)
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [component.text("An unexpected error occurred.")],
        }),
      ],
    })).catch(() => {})
  }
}

export async function handle_guide_language_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const language   = interaction.values[0]
  const guide_type = interaction.customId.replace("guide_lang_", "")
  const guide_file = language === "id" ? `${guide_type}-id` : guide_type

  await interaction.deferReply({ flags: 32832 } as any)

  try {
    let guide_content = load_guide(guide_file)
    if (!guide_content) guide_content = load_guide(guide_type)

    if (!guide_content) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [component.text("Guide not found.")],
          }),
        ],
      }))
      return
    }

    const { cleaned, buttons }  = parse_buttons(guide_content)
    guide_buttons.set(guide_file, buttons)
    const guide_components      = parse_guide_to_components(cleaned, guide_file, buttons)

    const result = await api.edit_deferred_reply(interaction, {
      flags:      32832,
      components: [{ type: 17, components: guide_components }],
    } as any)

    if (result.error) {
      console.error(`[ - GUIDE SELECT - ] Failed to send guide lang (${guide_file}):`, result)
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [component.text("Failed to load guide. Please try again.")],
          }),
        ],
      })).catch(() => {})
    }
  } catch (err) {
    console.error(`[ - GUIDE SELECT - ] Unexpected error:`, err)
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [component.text("An unexpected error occurred.")],
        }),
      ],
    })).catch(() => {})
  }
}
