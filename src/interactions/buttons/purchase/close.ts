import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { remove_open_ticket } from "./open";
import { purchase_owners, purchase_staff, purchase_logs, purchase_ticket_ids, purchase_claimed_by, purchase_open_time } from "../../shared/ticket_state";

const log_channel_id = "1392575437481447557";

export async function handle_purchase_close(interaction: ButtonInteraction) {
  const thread = interaction.channel as ThreadChannel;
  
  if (!thread.isThread()) {
    await interaction.reply({
      content: "This command can only be used in a ticket thread.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const thread_name = thread.name;
  const owner_id = purchase_owners.get(thread.id);
  const ticket_id = purchase_ticket_ids.get(thread.id) || "Unknown";
  const claimed_by = purchase_claimed_by.get(thread.id);
  const open_time = purchase_open_time.get(thread.id);
  const open_log_id = purchase_logs.get(thread.id);

  if (owner_id) {
    remove_open_ticket(owner_id);
    purchase_owners.delete(thread.id);
  }

  purchase_staff.delete(thread.id);
  purchase_logs.delete(thread.id);
  purchase_ticket_ids.delete(thread.id);
  purchase_claimed_by.delete(thread.id);
  purchase_open_time.delete(thread.id);

  const timestamp = Math.floor(Date.now() / 1000);

  const log_channel = interaction.client.channels.cache.get(log_channel_id) as TextChannel;
  if (log_channel) {
    if (open_log_id) {
      await fetch(`https://discord.com/api/v10/channels/${log_channel.id}/messages/${open_log_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        },
      });
    }

    let owner_avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
    if (owner_id) {
      try {
        const owner = await interaction.client.users.fetch(owner_id);
        owner_avatar = owner.displayAvatarURL({ size: 128 });
      } catch {}
    }

    const log_response = await fetch(`https://discord.com/api/v10/channels/${log_channel.id}/messages`, {
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
                    content: `## Purchase Ticket Closed\nA purchase ticket has been closed.`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: owner_avatar,
                  },
                },
              },
              {
                type: 14,
              },
              {
                type: 10,
                content: `- **Ticket ID:** \`${ticket_id}\`\n- **Opened By:** ${owner_id ? `<@${owner_id}>` : "Unknown"}\n- **Closed By:** <@${interaction.user.id}>`,
              },
              {
                type: 14,
              },
              {
                type: 10,
                content: `- **Open Time:** ${open_time ? `<t:${open_time}:F>` : "Unknown"}\n- **Claimed By:** ${claimed_by ? `<@${claimed_by}>` : "Not claimed"}\n- **Reason:** -`,
              },
            ],
          },
        ],
      }),
    });
    const log_data = await log_response.json();
    console.log("Close log response:", log_data);
  }

  if (owner_id) {
    try {
      const owner = await interaction.client.users.fetch(owner_id);
      const dm_channel = await owner.createDM();
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
                  content: `## <:ticket:1411878131366891580> Purchase Ticket Closed\n\nYour purchase ticket has been closed.\n\n- **Ticket ID:** \`${ticket_id}\`\n- **Closed by:** <@${interaction.user.id}>\n- **Closed:** <t:${timestamp}:F>\n\nThank you for using our service!`,
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
  }

  await thread.setLocked(true);
  await thread.setArchived(true);

  await interaction.editReply({
    content: "Ticket closed.",
  });
}
