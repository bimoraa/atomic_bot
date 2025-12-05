import { StringSelectMenuInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { has_priority_role, priority_role_id } from "../../shared/ticket_state";

export async function handle(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== "ticket_select") return false;

  const member = interaction.member as GuildMember;

  if (!has_priority_role(member)) {
    await interaction.reply({
      content: `You need the <@&${priority_role_id}> role to create a ticket.`,
      ephemeral: true,
    });
    return true;
  }

  const issue_type = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${issue_type}`)
    .setTitle("Create Ticket");

  const description_input = new TextInputBuilder()
    .setCustomId("ticket_description")
    .setLabel("Describe your issue")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Please explain your issue in detail...")
    .setRequired(true)
    .setMaxLength(1000);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(description_input);
  modal.addComponents(row);

  await interaction.showModal(modal);
  return true;
}
