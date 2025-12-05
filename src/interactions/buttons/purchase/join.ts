import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js";
import { purchase_logs, purchase_staff, purchase_owners, purchase_log_channel_id, purchase_ticket_ids } from "../../shared/ticket_state";
import { is_admin } from "../../../functions/permissions";

export async function handle_join_purchase(interaction: ButtonInteraction) {
  if (!is_admin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: "Only staff can join tickets.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const thread_id = interaction.customId.replace("join_purchase_", "");
  const member = interaction.member as GuildMember;
  const guild = interaction.guild!;

  const thread = guild.channels.cache.get(thread_id) as ThreadChannel;
  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." });
    return;
  }

  await thread.members.add(member.id);

  let staff_list = purchase_staff.get(thread_id) || [];
  if (!staff_list.includes(member.id)) {
    staff_list.push(member.id);
    purchase_staff.set(thread_id, staff_list);
  }

  const staff_mentions = staff_list.map((id: string) => `<@${id}>`);
  const owner_id = purchase_owners.get(thread_id) || "Unknown";
  const ticket_id = purchase_ticket_ids.get(thread_id) || "Unknown";

  const log_message_id = purchase_logs.get(thread_id);

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(purchase_log_channel_id) as TextChannel;
    if (log_channel) {
      try {
        const owner = await guild.members.fetch(owner_id).catch(() => null);
        const avatar_url = owner?.displayAvatarURL({ size: 128 }) || "https://cdn.discordapp.com/embed/avatars/0.png";

        const edit_url = `https://discord.com/api/v10/channels/${log_channel.id}/messages/${log_message_id}`;
        await fetch(edit_url, {
          method: "PATCH",
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
                        content: `## Join Ticket\na Purchase Ticket is Opened!\n\n- **Ticket ID:** \`${ticket_id}\`\n- **Opened by:** <@${owner_id}>`,
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
                    content: `- **Staff in Ticket:** ${staff_mentions.length}\n- **Staff Members:** ${staff_mentions.join(" ") || "None"}`,
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
                        custom_id: `join_purchase_${thread_id}`,
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
  }

  await thread.send({
    content: `<@${member.id}> has joined the ticket.`,
  });

  await interaction.editReply({ content: `You have joined the ticket! <#${thread_id}>` });
}
