import { ModalSubmitInteraction, GuildMember, TextChannel, ChannelType } from "discord.js";
import { ticket_logs, ticket_avatars, ticket_owners, ticket_issues, ticket_descriptions, issue_labels, log_channel_id, ticket_channel_id } from "../../shared/ticket_state";

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("ticket_modal_")) return false;

  const issue_type = interaction.customId.replace("ticket_modal_", "");
  const issue_label = issue_labels[issue_type] || issue_type;
  const description = interaction.fields.getTextInputValue("ticket_description");

  const member = interaction.member as GuildMember;
  const guild = interaction.guild!;

  await interaction.deferReply({ ephemeral: true });

  const parent_channel = guild.channels.cache.get(ticket_channel_id) as TextChannel;
  if (!parent_channel) {
    await interaction.editReply({ content: "Ticket channel not found." });
    return true;
  }

  const thread_name = `ticket-${member.user.username}-${Date.now().toString(36)}`;

  const thread = await parent_channel.threads.create({
    name: thread_name,
    type: ChannelType.PrivateThread,
    invitable: false,
  });

  await thread.members.add(member.id);

  const welcome_url = `https://discord.com/api/v10/channels/${thread.id}/messages`;
  await fetch(welcome_url, {
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
                  content: `## Ticket Created\n**User:** <@${member.id}>\n**Issue:** ${issue_label}\n**Description:**\n${description}\n\nPlease wait for a staff member to assist you.`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: member.user.displayAvatarURL(),
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
                  custom_id: "close_ticket",
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  const log_channel = guild.channels.cache.get(log_channel_id) as TextChannel;
  if (log_channel) {
    const log_url = `https://discord.com/api/v10/channels/${log_channel.id}/messages`;
    const log_response = await fetch(log_url, {
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
                    content: `## Join Ticket\na Priority Support Ticket is Opened!\n\n- Opened by: <@${member.id}>\n- Issue: ${issue_label}\n- Description: ${description}`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: member.user.displayAvatarURL(),
                  },
                },
              },
              {
                type: 14,
              },
              {
                type: 10,
                content: `- Staff in Ticket: 0\n- Staff Members: None`,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3,
                    label: "Join Ticket",
                    custom_id: `join_ticket_${thread.id}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    if (log_response.ok) {
      const log_message = await log_response.json() as { id: string };
      ticket_logs.set(thread.id, log_message.id);
      ticket_avatars.set(thread.id, member.user.displayAvatarURL());
      ticket_owners.set(thread.id, member.id);
      ticket_issues.set(thread.id, issue_label);
      ticket_descriptions.set(thread.id, description);
    }
  }

  await interaction.editReply({
    content: `Ticket created! <#${thread.id}>`,
  });

  return true;
}
