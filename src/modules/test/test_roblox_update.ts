import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js";
import { Command } from "../../shared/types/command";
import { test_roblox_update_notification } from "../../shared/database/services/roblox_update";
import { is_admin } from "../../shared/database/settings/permissions";


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

    const versions = await test_roblox_update_notification();

    if (versions && versions.length > 0) {
      const lines = versions.map(v => `- ${v.platform}: \`${v.version}\` (client: \`${v.client_version}\`)`)
      await interaction.editReply({
        content: `Test notifications sent!\n${lines.join("\n")}`,
      });
    } else {
      await interaction.editReply({
        content: "Failed to fetch Roblox versions (all platforms returned empty).",
      });
    }
  },
};
