import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  GuildMember,
} from "discord.js";
import { is_admin } from "../../../functions/permissions";

export async function handle_purchase_close_reason(interaction: ButtonInteraction) {
  if (!is_admin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: "Only staff can use this button.",
      flags: 64,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("purchase_close_reason_modal")
    .setTitle("Close Ticket with Reason");

  const reason_input = new TextInputBuilder()
    .setCustomId("close_reason")
    .setLabel("Reason")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter the reason for closing this ticket...")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(reason_input)
  );

  await interaction.showModal(modal);
}
