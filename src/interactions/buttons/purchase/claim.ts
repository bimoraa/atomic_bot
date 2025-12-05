import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js";
import { is_admin } from "../../../functions/permissions";
import { purchase_claimed_by, purchase_log_channel_id } from "../../shared/ticket_state";

const log_channel_id = purchase_log_channel_id;

export async function handle_purchase_claim(interaction: ButtonInteraction) {
  if (!is_admin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: "Only staff can claim tickets.",
      flags: 64,
    });
    return;
  }

  const thread = interaction.channel as ThreadChannel;

  if (!thread.isThread()) {
    await interaction.reply({
      content: "This can only be used in a ticket thread.",
      flags: 64,
    });
    return;
  }

  if (purchase_claimed_by.has(thread.id)) {
    await interaction.reply({
      content: `This ticket has already been claimed by <@${purchase_claimed_by.get(thread.id)}>.`,
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  await thread.members.add(interaction.user.id);
  purchase_claimed_by.set(thread.id, interaction.user.id);

  const timestamp = Math.floor(Date.now() / 1000);

  await thread.send({
    content: `<@${interaction.user.id}> has claimed this ticket.`,
  });

  const log_channel = interaction.client.channels.cache.get(log_channel_id) as TextChannel;
  if (log_channel) {
    await fetch(`https://discord.com/api/v10/channels/${log_channel.id}/messages`, {
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
                content: `## Ticket Claimed\n**Thread:** <#${thread.id}>\n**Claimed by:** <@${interaction.user.id}>\n**Claimed:** <t:${timestamp}:R>`,
              },
            ],
          },
        ],
      }),
    });
  }

  await interaction.editReply({
    content: "You have claimed this ticket.",
  });
}
