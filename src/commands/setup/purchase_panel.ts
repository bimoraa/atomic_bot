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
    .setName("purchase_panel")
    .setDescription("Send the purchase ticket panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const channel = interaction.client.channels.cache.get("1395947216375513298") as TextChannel;
    if (!channel) {
      await interaction.editReply({
        content: "Panel channel not found.",
      });
      return;
    }

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
            components: [
              {
                type: 10,
                content: "## Purchase Ticket\nIf you have questions about the script please use <#1250786601462923396> to ask our staffs.\n\nYou can only create a ticket to purchase a script. Opening a ticket without making a purchase will be considered intentional trolling and a warning will be given.\n\nOur script price is stated in <#1250770696876068927>",
              },
              {
                type: 14,
                spacing: 2,
              },
              {
                type: 9,
                components: [
                  {
                    type: 10,
                    content: "## Payment Method:\n<:qris:1251913366713139303> - QRIS ( Quick Response Code Indonesian Standard ) \n<:paypal:1251913398816604381> - Paypal \n<:gopay:1251913342646489181> - Gopay\n<:dana:1251913282923790379> - Dana\n<:ovo:1251913316092088404> - Ovo",
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: "https://cdn.discordapp.com/icons/1250337227582472243/a_b68981606529e316b31e92e4eb67b498.gif",
                  },
                },
              },
              {
                type: 14,
                spacing: 2,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 2,
                    label: "Open",
                    emoji: {
                      id: "1411878131366891580",
                      name: "ticket",
                    },
                    custom_id: "purchase_open",
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    await interaction.editReply({
      content: "Purchase panel sent!",
    });
  },
};
