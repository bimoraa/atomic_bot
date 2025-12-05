import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import { is_admin } from "../../../functions/permissions"
import { purchase_claimed_by, purchase_log_channel_id } from "../../shared/ticket_state"
import { component, time, api } from "../../../utils"

export async function handle_purchase_claim(interaction: ButtonInteraction) {
  if (!is_admin(interaction.member as GuildMember)) {
    await interaction.reply({
      content: "Only staff can claim tickets.",
      flags: 64,
    })
    return
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content: "This can only be used in a ticket thread.",
      flags: 64,
    })
    return
  }

  if (purchase_claimed_by.has(thread.id)) {
    await interaction.reply({
      content: `This ticket has already been claimed by <@${purchase_claimed_by.get(thread.id)}>.`,
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  await thread.members.add(interaction.user.id)
  purchase_claimed_by.set(thread.id, interaction.user.id)

  const timestamp = time.now()

  await thread.send({
    content: `<@${interaction.user.id}> has claimed this ticket.`,
  })

  const log_channel = interaction.client.channels.cache.get(purchase_log_channel_id) as TextChannel
  if (log_channel) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Ticket Claimed`,
              `**Thread:** <#${thread.id}>`,
              `**Claimed by:** <@${interaction.user.id}>`,
              `**Claimed:** ${time.relative_time(timestamp)}`,
            ]),
          ],
        }),
      ],
    })

    await api.send_components_v2(log_channel.id, api.get_token(), message)
  }

  await interaction.editReply({
    content: "You have claimed this ticket.",
  })
}
