import { ButtonInteraction } from "discord.js";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

export async function handle_review_submit(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("review_modal")
    .setTitle("Submit a Review");

  const review_input = new TextInputBuilder()
    .setCustomId("review_text")
    .setLabel("Your Review")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Tell us about your experience...")
    .setRequired(true)
    .setMaxLength(500);

  const rating_input = new TextInputBuilder()
    .setCustomId("review_rating")
    .setLabel("Rating (1-5)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("5")
    .setRequired(true)
    .setMaxLength(1);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(review_input),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rating_input)
  );

  await interaction.showModal(modal);
}
