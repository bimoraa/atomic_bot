import { StringSelectMenuInteraction } from "discord.js"
import { component }                   from "../../utils"
import { guide_buttons, ParsedButton } from "../../commands/setup/guide_panel"
import fs                              from "fs"
import path                            from "path"

function load_guide(name: string): string | null {
  const guide_path = path.join(process.cwd(), "src/guide", `${name}.md`)
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

  const guide_content = load_guide(selected)

  if (!guide_content) {
    await fetch(
      `https://discord.com/api/v10/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
      {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          flags:   32832,
          content: "Guide not found.",
        }),
      }
    )
    return
  }

  const { cleaned, buttons } = parse_buttons(guide_content)

  guide_buttons.set(selected, buttons)

  const guide_components = parse_guide_to_components(cleaned, selected, buttons)

  const message = {
    flags:      32832,
    components: [
      {
        type:       17,
        components: guide_components,
      },
    ],
  }

  await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
    {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(message),
    }
  )
}
