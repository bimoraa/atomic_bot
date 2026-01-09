import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember }  from "discord.js"
import { Command }                                                        from "../../shared/types/command"
import { is_admin, is_staff }                                             from "../../shared/database/permissions"
import { api, component }                                                 from "../../shared/utils"
import fs                                                                 from "fs"
import path                                                               from "path"

export const guide_buttons = new Map<string, ParsedButton[]>()

export interface ParsedButton {
  title: string
  content: string
}

function load_guide(name: string): string | null {
  const guide_path = path.join(process.cwd(), "src/guide", `${name}.md`)
  if (!fs.existsSync(guide_path)) return null
  return fs.readFileSync(guide_path, "utf-8")
}

function parse_buttons(content: string): { cleaned: string; buttons: ParsedButton[] } {
  const buttons: ParsedButton[] = []
  const button_regex = /kiara:make_button\("([^"]+)",\s*"([\s\S]*?)"\);/g

  const cleaned = content.replace(button_regex, (_, title, buttonContent) => {
    buttons.push({
      title: title.trim(),
      content: buttonContent.trim(),
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
  const sections = content.split(/\n---\n/)
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

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("guide")
    .setDescription("Send guide panel")
    .addStringOption(opt =>
      opt.setName("type")
        .setDescription("Guide type")
        .setRequired(true)
        .addChoices(
          { name: "Submit Payment", value: "submit-payment" },
          { name: "Purchase Ticket", value: "ticket" },
          { name: "Helper Ticket", value: "helper" },
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "Only admins can send guide panels.",
        flags: 64,
      })
      return
    }

    const guide_type = interaction.options.getString("type", true)
    
    if ((guide_type === "submit-payment" || guide_type === "ticket") && !is_staff(member)) {
      await interaction.reply({
        content: "Only Staff members can send Submit Payment and Purchase Ticket guides. Helpers can only send Helper Ticket guide.",
        flags: 64,
      })
      return
    }
    
    const guide_content = load_guide(guide_type)

    if (!guide_content) {
      await interaction.reply({ content: "Guide not found.", flags: 64 })
      return
    }

    const language_select_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Helper Guide",
              "Select your preferred language to view the guide.",
            ]),
            component.divider(2),
            component.select_menu(`guide_lang_${guide_type}`, "Select Language", [
              { label: "English",   value: "en", description: "English version" },
              { label: "Indonesia", value: "id", description: "Versi Bahasa Indonesia" },
            ]),
          ],
        }),
      ],
    })

    await interaction.deferReply({ flags: 64 })

    const result = await api.send_components_v2(interaction.channelId, api.get_token(), language_select_message)

    if (result.error) {
      await interaction.editReply({ content: `Error: ${JSON.stringify(result)}` })
      return
    }

    await interaction.editReply({ content: "Guide panel sent!" })
  },
}

export default command
