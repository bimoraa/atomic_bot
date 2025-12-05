import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js";
import { Command } from "../../types/command";
import { test_roblox_update_notification } from "../../functions/roblox_update";
import { is_admin } from "../../functions/permissions";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("test_roblox_update")
    .setDescription("Test roblox update notification") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const version_info = await test_roblox_update_notification();

    if (version_info) {
      await interaction.editReply({
        content: `Test notification sent!\n**Version:** \`${version_info.version}\`\n**Client Version:** \`${version_info.client_version}\``,
      });
    } else {
      await interaction.editReply({
        content: "Failed to fetch Roblox version.",
      });
    }
  },
};
