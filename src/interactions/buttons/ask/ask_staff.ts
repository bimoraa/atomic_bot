import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js"

export async function handle_ask_staff_button(interaction: ButtonInteraction): Promise<void> {
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
