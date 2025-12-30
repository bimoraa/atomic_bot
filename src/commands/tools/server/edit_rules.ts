import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { Command } from "../../../types/command"
import { is_admin } from "../../../services/permissions"
import { api } from "../../../utils"

const rules_channel_id = "1250373760016715866"

interface ComponentV2 {
  type: number
  content?: string
  components?: ComponentV2[]
  accessory?: { media?: { url?: string } }
}

function parse_rules_message(data: { components?: ComponentV2[] }): { header: string; rules: string; footer: string } {
  let header = ""
  let rules  = ""
  let footer = ""

  const container = data.components?.[0]
  if (!container?.components) return { header, rules, footer }

  const components = container.components
  let text_index   = 0

  for (const comp of components) {
    if (comp.type === 9 && comp.components?.[0]?.content) {
      const content = comp.components[0].content
      const lines   = content.split("\n").filter((l: string) => !l.startsWith("## Server Rules"))
      header        = lines.join("\n").trim()
    }

    if (comp.type === 10 && comp.content) {
      if (text_index === 0) {
        rules = comp.content
        text_index++
      } else {
        footer = comp.content
      }
    }
  }

  return { header, rules, footer }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("edit_rules")
    .setDescription("Edit the server rules message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("The ID of the rules message to edit")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const message_id = interaction.options.getString("message_id", true)

    const message_data = await api.get_message(rules_channel_id, message_id, api.get_token())

    if (!message_data || message_data.error) {
      await interaction.reply({
        content: "Could not fetch the rules message. Make sure the message ID is correct.",
        ephemeral: true,
      })
      return
    }

    const { header, rules, footer } = parse_rules_message(message_data as { components?: ComponentV2[] })

    const modal = new ModalBuilder()
      .setCustomId(`edit_rules:${message_id}`)
      .setTitle("Edit Server Rules")

    const header_input = new TextInputBuilder()
      .setCustomId("header")
      .setLabel("Header Text")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Welcome message for the rules...")
      .setValue(header || "Hello and welcome!")
      .setRequired(true)
      .setMaxLength(500)

    const rules_input = new TextInputBuilder()
      .setCustomId("rules")
      .setLabel("Rules (use ### for titles)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("### 1. Rule Title\nRule description...")
      .setValue(rules || "### 1. Rule\nDescription")
      .setRequired(true)
      .setMaxLength(4000)

    const footer_input = new TextInputBuilder()
      .setCustomId("footer")
      .setLabel("Footer Text")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Closing message...")
      .setValue(footer || "## Have Fun!")
      .setRequired(true)
      .setMaxLength(500)

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(header_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rules_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(footer_input)
    )

    await interaction.showModal(modal)
  },
}
