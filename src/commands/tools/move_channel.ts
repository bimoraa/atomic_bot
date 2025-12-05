import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  GuildChannel,
  CategoryChannel,
  GuildMember,
} from "discord.js";
import { Command } from "../../types/command";
import { move_channel_to_category } from "../../functions/channel_manager";
import { is_admin } from "../../functions/permissions";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("move_channel")
    .setDescription("Move a channel to a category with synced permissions")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to move")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("The target category")
        .addChannelTypes(ChannelType.GuildCategory)
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

    const channel = interaction.options.getChannel("channel") as GuildChannel;
    const category = interaction.options.getChannel("category") as CategoryChannel;

    if (!channel || !category) {
      await interaction.reply({ content: "Invalid channel or category.", ephemeral: true });
      return;
    }

    try {
      await move_channel_to_category(channel, category);
      await interaction.reply({
        content: `Successfully moved <#${channel.id}> to **${category.name}** with synced permissions.`,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: "Failed to move the channel. Make sure I have the required permissions.",
        ephemeral: true,
      });
    }
  },
};
