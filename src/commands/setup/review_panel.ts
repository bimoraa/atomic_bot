import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js";
import { Command } from "../../types/command";
import { is_admin } from "../../functions/permissions";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("review_panel")
    .setDescription("Send the review panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;

    await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: null,
            spoiler: false,
            components: [
              {
                type: 10,
                content: "# ⭐ Reviews\nShare your experience with us!",
              },
              {
                type: 14,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 1,
                    label: "Submit a Review",
                    custom_id: "review_submit",
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    await interaction.reply({
      content: "Review panel sent!",
      ephemeral: true,
    });
  },
};
