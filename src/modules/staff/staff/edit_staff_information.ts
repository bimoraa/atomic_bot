import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js"
import { Command }  from "../../../shared/types/command"
import { is_admin } from "../../../shared/database/settings/permissions"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("edit-staff-information")
    .setDescription("Edit staff information section")
    .addStringOption((option) =>
      option
        .setName("target")
        .setDescription("Section to edit")
        .setRequired(true)
        .addChoices(
          { name: "Communication Rules", value: "communication_rules" },
          { name: "Staff Rules", value: "staff_rules" },
          { name: "Purchase Ticket Guide", value: "purchase_ticket" },
          { name: "Priority Support Guide", value: "priority_support" },
          { name: "Ask Staff Guide", value: "ask_staff" }
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const target = interaction.options.getString("target", true)

    const modal = new ModalBuilder()
      .setCustomId(`edit_staff_info:${target}`)
      .setTitle(`Edit ${target.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`)

    const message_id_input = new TextInputBuilder()
      .setCustomId("message_id")
      .setLabel("Message ID")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Message ID to edit")
      .setRequired(true)

    const content_input = new TextInputBuilder()
      .setCustomId("content")
      .setLabel("Content (markdown supported)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Enter the updated content...")
      .setRequired(true)

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(message_id_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(content_input)
    )

    await interaction.showModal(modal)
  },
}
