import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js"

export interface text_input_options {
  custom_id: string
  label: string
  style?: "short" | "paragraph"
  placeholder?: string
  required?: boolean
  min_length?: number
  max_length?: number
  value?: string
}

export function create_text_input(options: text_input_options): TextInputBuilder {
  const input = new TextInputBuilder()
    .setCustomId(options.custom_id)
    .setLabel(options.label)
    .setStyle(options.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)

  if (options.placeholder) {
    input.setPlaceholder(options.placeholder)
  }

  if (options.required !== undefined) {
    input.setRequired(options.required)
  }

  if (options.min_length !== undefined) {
    input.setMinLength(options.min_length)
  }

  if (options.max_length !== undefined) {
    input.setMaxLength(options.max_length)
  }

  if (options.value !== undefined) {
    input.setValue(options.value)
  }

  return input
}

export function create_modal(
  custom_id: string,
  title: string,
  ...inputs: TextInputBuilder[]
): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(custom_id)
    .setTitle(title)

  for (const input of inputs) {
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input))
  }

  return modal
}

export function text_input_row(input: TextInputBuilder): ActionRowBuilder<TextInputBuilder> {
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input)
}
