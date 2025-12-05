import { ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

export async function handle(interaction: ButtonInteraction) {
  if (interaction.customId !== "close_ticket") return false;

  const modal = new ModalBuilder()
    .setCustomId("close_ticket_modal")
    .setTitle("Close Ticket");

  const reason_input = new TextInputBuilder()
    .setCustomId("close_reason")
    .setLabel("Close Reason")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter the reason for closing this ticket...")
    .setRequired(true)
    .setMaxLength(500);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reason_input);
  modal.addComponents(row);

  await interaction.showModal(modal);
  return true;
}
