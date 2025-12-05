import {
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  GuildMember,
  CategoryChannel,
} from "discord.js";

const ticket_category_id = "1260623558175096897";
const log_channel_id = "1445745610027171892";
const priority_role_id = "1398313779380617459";

interface TicketOptions {
  issue_type: string;
  issue_label: string;
}

export async function create_ticket(
  member: GuildMember,
  options: TicketOptions
): Promise<TextChannel | null> {
  const guild = member.guild;
  const category = guild.channels.cache.get(ticket_category_id) as CategoryChannel;

  if (!category) return null;

  const ticket_name = `ticket-${member.user.username}-${Date.now().toString(36)}`;

  const ticket_channel = await guild.channels.create({
    name: ticket_name,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  return ticket_channel;
}

export async function send_ticket_log(
  ticket_channel: TextChannel,
  member: GuildMember,
  issue_type: string
) {
  const log_channel = member.guild.channels.cache.get(log_channel_id) as TextChannel;
  if (!log_channel) return;

  const url = `https://discord.com/api/v10/channels/${log_channel.id}/messages`;

  await fetch(url, {
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
              type: 10,
              content: `## Ticket Opened\n- **User:** ${member.user.tag} (${member.id})\n- **Issue:** ${issue_type}\n- **Channel:** <#${ticket_channel.id}>\n- **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            },
          ],
        },
      ],
    }),
  });
}

export function has_priority_role(member: GuildMember): boolean {
  return member.roles.cache.has(priority_role_id);
}
