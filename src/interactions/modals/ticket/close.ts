import { ModalSubmitInteraction, ThreadChannel, TextChannel, GuildMember } from "discord.js";
import { ticket_logs, ticket_staff, ticket_avatars, ticket_owners, ticket_issues, ticket_descriptions, log_channel_id, closed_log_channel_id } from "../../shared/ticket_state";

const logo_url = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true";

export async function handle(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== "close_ticket_modal") return false;

  const thread = interaction.channel as ThreadChannel;
  const guild = interaction.guild!;
  const closed_by = interaction.member as GuildMember;
  const close_reason = interaction.fields.getTextInputValue("close_reason");

  const log_message_id = ticket_logs.get(thread.id);
  const owner_id = ticket_owners.get(thread.id) || closed_by.id;
  const issue = ticket_issues.get(thread.id) || "Not specified";
  const description = ticket_descriptions.get(thread.id) || "No description provided";
  const staff_list = ticket_staff.get(thread.id) || [];

  await interaction.reply({ content: "Closing ticket in 5 seconds..." });

  setTimeout(async () => {
    try {
      if (log_message_id) {
        const log_channel = guild.channels.cache.get(log_channel_id) as TextChannel;
        if (log_channel) {
          try {
            await log_channel.messages.delete(log_message_id);
          } catch {}
        }
      }

      const closed_log_channel = guild.channels.cache.get(closed_log_channel_id) as TextChannel;
      if (closed_log_channel) {
        const unix_timestamp = Math.floor(Date.now() / 1000);
        const staff_mentions = staff_list.map((id: string) => `<@${id}>`).join(", ") || "None";

        await fetch(`https://discord.com/api/v10/channels/${closed_log_channel.id}/messages`, {
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
                        content: `## Ticket Closed\nA Priority Support Ticket has been closed.`,
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
                    type: 14,
                  },
                  {
                    type: 10,
                    content: `**Ticket Information**\n- Ticket: \`${thread.name}\`\n- Issue: ${issue}\n- Detail Issue: ${description}\n\n**User Information**\n- Opened By: <@${owner_id}>\n- Closed By: <@${closed_by.id}>\n\n**Close Details**\n- Closed At: <t:${unix_timestamp}:F>\n- Close Reason: ${close_reason}\n- Staff Involved: ${staff_mentions}`,
                  },
                  {
                    type: 14,
                  },
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: "View Thread",
                        url: `https://discord.com/channels/${guild.id}/${thread.id}`,
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        });
      }

      ticket_logs.delete(thread.id);
      ticket_staff.delete(thread.id);
      ticket_avatars.delete(thread.id);
      ticket_owners.delete(thread.id);
      ticket_issues.delete(thread.id);
      ticket_descriptions.delete(thread.id);

      const members = await thread.members.fetch();
      for (const [member_id] of members) {
        if (member_id !== interaction.client.user?.id) {
          try {
            await thread.members.remove(member_id);
          } catch {}
        }
      }

      await thread.setLocked(true);
    } catch {}
  }, 5000);

  return true;
}
