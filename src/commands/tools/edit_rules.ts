import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { Command } from "../../types/command"
import { is_admin } from "../../functions/permissions"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("edit_rules")
    .setDescription("Edit the server rules message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("The ID of the rules message to edit")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const message_id = interaction.options.getString("message_id", true)

    const modal = new ModalBuilder()
      .setCustomId(`edit_rules:${message_id}`)
      .setTitle("Edit Server Rules")

    const header_input = new TextInputBuilder()
      .setCustomId("header")
      .setLabel("Header Text")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Welcome message for the rules...")
      .setValue("Hello and welcome to the Sades Discord Server! We want everyone to have fun here, regardless of background or rank, so we've got a few rules you'll need to follow:")
      .setRequired(true)
      .setMaxLength(500)

    const rules_input = new TextInputBuilder()
      .setCustomId("rules")
      .setLabel("Rules (use ### for titles)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("### 1. Rule Title\nRule description...")
      .setValue([
        "### 1. Respect Everyone",
        "Treat others with kindness and respect. No harassment, toxic behavior, or personal attacks.",
        "",
        "### 2. No Controversial Topics",
        "Avoid discussions about politics, religion, or sensitive issues that could create conflicts.",
        "",
        "### 3. Zero Tolerance for Hate Speech",
        "No racism, sexism, homophobia, or any form of discrimination.",
        "",
        "### 4. No Spam or Unwanted Promotions",
        "Avoid excessive messages, emojis, caps, pings, or posting Discord invites without permission.",
      ].join("\n"))
      .setRequired(true)
      .setMaxLength(4000)

    const footer_input = new TextInputBuilder()
      .setCustomId("footer")
      .setLabel("Footer Text")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Closing message...")
      .setValue("## Have Fun & Engage!\nBe friendly, make new friends, and contribute positively to the community. Respect others and enjoy your stay!")
      .setRequired(true)
      .setMaxLength(500)

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(header_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rules_input),
      new ActionRowBuilder<TextInputBuilder>().addComponents(footer_input)
    )

    await interaction.showModal(modal)
  },
}
