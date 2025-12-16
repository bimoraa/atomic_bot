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

    const target_channel  = interaction.options.getChannel("channel") as GuildChannel;
    const category_option = interaction.options.getChannel("category") as CategoryChannel | null;

    const origin_channel   = interaction.channel;
    const default_category = (
      origin_channel && "parent" in origin_channel ? (origin_channel.parent as CategoryChannel | null) : null
    );
    const target_category = category_option ?? default_category;

    if (!target_channel) {
      await interaction.reply({ content: "Invalid channel.", ephemeral: true });
      return;
    }

    if (!target_category) {
      await interaction.reply({
        content: "Target category not provided, and this channel is not inside a category.",
        ephemeral: true,
      });
      return;
    }

    const guild      = interaction.guild;
    const bot_member = guild?.members.me;

    if (!guild || !bot_member) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const required_permissions = ["ViewChannel", "ManageChannels"] as const;
    const missing_in_channel   = required_permissions.filter(
      (permission) => !bot_member.permissionsIn(target_channel.id).has(permission)
    );
    const missing_in_category  = required_permissions.filter(
      (permission) => !bot_member.permissionsIn(target_category.id).has(permission)
    );

    if (missing_in_channel.length > 0 || missing_in_category.length > 0) {
      const missing_channel  = missing_in_channel.map((p) => `\`${p}\``).join(", ");
      const missing_category = missing_in_category.map((p) => `\`${p}\``).join(", ");
      const parts            = [] as string[];

      if (missing_in_channel.length > 0) parts.push(`Missing in channel: ${missing_channel}`);
      if (missing_in_category.length > 0) parts.push(`Missing in category: ${missing_category}`);

      await interaction.reply({
        content: `I can't move the channel due to missing permissions. ${parts.join(" | ")}`,
        ephemeral: true,
      });
      return;
    }

    try {
      await move_channel_to_category(target_channel, target_category);
      await interaction.reply({
        content: `Successfully moved <#${target_channel.id}> to **${target_category.name}** with synced permissions.`,
        ephemeral: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await interaction.reply({
        content: `Failed to move the channel. ${message}`,
        ephemeral: true,
      });
    }
  },
};
