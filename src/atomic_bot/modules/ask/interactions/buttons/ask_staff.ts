// - ask staff 按钮的交互注册 - \
// - registers the ask staff button interaction - \
// - 提问员工按钮 - \
// - ask staff button - \

import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js"

export async function handle_ask_staff_button(interaction: ButtonInteraction): Promise<void> {
  if (interaction.replied || interaction.deferred) return

  const modal = new ModalBuilder()
    .setCustomId("ask_staff_modal")
    .setTitle("Ask a Staff")

  const question_input = new TextInputBuilder()
    .setCustomId("question")
    .setLabel("Your Question")
    .setPlaceholder("Type your question here...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(question_input)
  modal.addComponents(row)

  await interaction.showModal(modal)
}
