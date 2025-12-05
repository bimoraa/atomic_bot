import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { Command } from "../../types/command";
import { is_admin } from "../../functions/permissions";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("devlog")
    .setDescription("Send developer update logs")
    .addStringOption((option) =>
      option
        .setName("script")
        .setDescription("Script name")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("version")
        .setDescription("Version number")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const script = interaction.options.getString("script", true);
    const version = interaction.options.getString("version", true);

    const modal = new ModalBuilder()
      .setCustomId(`devlog_modal_${script}_${version}`)
      .setTitle("Developer Logs");

    const added_input = new TextInputBuilder()
      .setCustomId("added")
      .setLabel("Added (one per line)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Feature 1\nFeature 2")
      .setRequired(false);

    const improved_input = new TextInputBuilder()
      .setCustomId("improved")
      .setLabel("Improved (one per line)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Improvement 1\nImprovement 2")
      .setRequired(false);

    const removed_input = new TextInputBuilder()
      .setCustomId("removed")
      .setLabel("Removed (one per line)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Removed 1\nRemoved 2")
      .setRequired(false);

    const fixed_input = new TextInputBuilder()
      .setCustomId("fixed")
      .setLabel("Fixed (one per line)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Bug fix 1\nBug fix 2")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(added_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(improved_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(removed_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(fixed_input)
    );

    await interaction.showModal(modal);
  },
};
