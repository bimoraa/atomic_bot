import {
  ButtonInteraction,
  TextChannel,
  ChannelType,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { purchase_log_channel_id, purchase_logs, purchase_staff, purchase_owners, purchase_ticket_ids, purchase_open_time, generate_ticket_id, purchase_ticket_parent_id } from "../../shared/ticket_state";

const ticket_parent_id = purchase_ticket_parent_id;

const open_tickets: Map<string, string> = new Map();

export async function handle_purchase_open(interaction: ButtonInteraction) {
  const user_id = interaction.user.id;

  if (open_tickets.has(user_id)) {
    await interaction.reply({
      content: "You already have an open purchase ticket. Please close it first before opening a new one.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const ticket_channel = interaction.client.channels.cache.get(ticket_parent_id) as TextChannel;
  if (!ticket_channel) {
    await interaction.editReply({
      content: "Ticket channel not found.",
    });
    return;
  }

  const thread = await ticket_channel.threads.create({
    name: `purchase-${interaction.user.username}`,
    type: ChannelType.PrivateThread,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  });

  await thread.members.add(user_id);

  open_tickets.set(user_id, thread.id);
  purchase_owners.set(thread.id, user_id);
  purchase_staff.set(thread.id, []);

  const ticket_id = generate_ticket_id();
  purchase_ticket_ids.set(thread.id, ticket_id);

  const timestamp = Math.floor(Date.now() / 1000);
  purchase_open_time.set(thread.id, timestamp);
  
  const avatar_url = interaction.user.displayAvatarURL({ size: 128 });

  const welcome_response = await fetch(`https://discord.com/api/v10/channels/${thread.id}/messages`, {
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
              type: 9,
              components: [
                {
                  type: 10,
                  content: `## Purchase Ticket\nWelcome to your purchase ticket, <@${user_id}>!\n\nPlease tell us which script you want to purchase and your preferred payment method.\n\nOur staff will assist you shortly.`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: avatar_url,
                },
              },
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4,
                  label: "Close Ticket",
                  custom_id: "purchase_close",
                },
                {
                  type: 2,
                  style: 2,
                  label: "Close with Reason",
                  custom_id: "purchase_close_reason",
                },
                {
                  type: 2,
                  style: 1,
                  label: "Claim Ticket",
                  custom_id: "purchase_claim",
                },
                {
                  type: 2,
                  style: 2,
                  label: "Add Member",
                  custom_id: "purchase_add_member",
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  const welcome_data = await welcome_response.json();
  console.log("Welcome panel response:", welcome_data);

  const log_channel = interaction.client.channels.cache.get(purchase_log_channel_id) as TextChannel;
  if (log_channel) {
    const response = await fetch(`https://discord.com/api/v10/channels/${log_channel.id}/messages`, {
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
                type: 9,
                components: [
                  {
                    type: 10,
                    content: `## Join Ticket\na Purchase Ticket is Opened!\n\n- **Ticket ID:** \`${ticket_id}\`\n- **Opened by:** <@${user_id}>`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: avatar_url,
                  },
                },
              },
              {
                type: 14,
              },
              {
                type: 10,
                content: `- **Staff in Ticket:** 0\n- **Staff Members:** None`,
              },
              {
                type: 14,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3,
                    label: "Join Ticket",
                    custom_id: `join_purchase_${thread.id}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const log_data = await response.json() as { id?: string };
    if (log_data.id) {
      purchase_logs.set(thread.id, log_data.id);
    }
  }

  try {
    const dm_channel = await interaction.user.createDM();
    await fetch(`https://discord.com/api/v10/channels/${dm_channel.id}/messages`, {
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
                content: `## <:ticket:1411878131366891580> Purchase Ticket Opened\n\nYour purchase ticket has been created!\n\n- **Ticket ID:** \`${ticket_id}\`\n- **Opened:** <t:${timestamp}:F>\n\nPlease check the ticket thread to continue.`,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 5,
                    label: "View Ticket",
                    url: `https://discord.com/channels/${interaction.guildId}/${thread.id}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
  } catch {}

  await interaction.editReply({
    content: `Your purchase ticket has been created: <#${thread.id}>`,
  });
}

export function remove_open_ticket(user_id: string) {
  open_tickets.delete(user_id);
}

export function has_open_ticket(user_id: string): boolean {
  return open_tickets.has(user_id);
}
