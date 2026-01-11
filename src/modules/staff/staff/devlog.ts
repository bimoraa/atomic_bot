import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { Command } from "../../../shared/types/command";
import { is_admin } from "../../../shared/database/settings/permissions";

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
    )
    .addRoleOption(option =>
      option
        .setName("role1")
        .setDescription("Role to tag (required)")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("role2")
        .setDescription("Role to tag (optional)")
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName("role3")
        .setDescription("Role to tag (optional)")
        .setRequired(false)
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

    const script  = interaction.options.getString("script", true)
    const version = interaction.options.getString("version", true)

    const role_ids = [
      interaction.options.getRole("role1", true)?.id,
      interaction.options.getRole("role2", false)?.id,
      interaction.options.getRole("role3", false)?.id,
    ].filter(Boolean) as string[]

    const unique_roles = Array.from(new Set(role_ids)).slice(0, 3)

    const modal_custom_id = [
      "devlog_modal",
      `s=${encodeURIComponent(script)}`,
      `v=${encodeURIComponent(version)}`,
      `r=${unique_roles.join(",")}`,
    ].join("|")

    const modal = new ModalBuilder()
      .setCustomId(modal_custom_id)
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
