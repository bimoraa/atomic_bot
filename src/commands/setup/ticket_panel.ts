import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js";
import { Command } from "../../types/command";
import { is_admin } from "../../functions/permissions";

const panel_channel_id = "1395947216375513298";
const priority_role_id = "1398313779380617459";
const logo_url = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket_panel")
    .setDescription("Send the priority support ticket panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.guild?.channels.cache.get(panel_channel_id) as TextChannel;

    if (!channel) {
      await interaction.reply({ content: "Panel channel not found.", ephemeral: true });
      return;
    }

    const url = `https://discord.com/api/v10/channels/${channel.id}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      },
      body: JSON.stringify({
        flags: 32768,
        components: [
          {
            type: 17,
            components: [
              {
                type: 9,
                components: [
                  {
                    type: 10,
                    content: `## Priority Support\nThis ticket can only be made by people with the role <@&${priority_role_id}> as they are given the priority support by our Customer Relations Team. However, there are lists of things you need to know before opening a ticket.\n\nYou can't open the ticket for the following reasons:\n\n1. Asking for refund\n2. Asking for sharing permission\n3. Asking help for daily executor key\n4. Asking for executors download link`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: logo_url,
                  },
                },
              },
              {
                type: 1,
                components: [
                  {
                    type: 3,
                    custom_id: "ticket_select",
                    placeholder: "Select Issue Type",
                    options: [
                      {
                        label: "Script Issue",
                        value: "script_issue",
                        description: "Asking or Help about Script",
                      },
                      {
                        label: "Discord Issue",
                        value: "discord_issue",
                        description: "Discord Account Transfer or Suspected Hacked Account",
                      },
                      {
                        label: "Others",
                        value: "others",
                        description: "Reserved for urgent requests only",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      await interaction.reply({ content: "Ticket panel sent!", ephemeral: true });
    } else {
      const error = await response.json();
      console.error("[ticket_panel] Error:", error);
      await interaction.reply({ content: "Failed to send ticket panel.", ephemeral: true });
    }
  },
};
