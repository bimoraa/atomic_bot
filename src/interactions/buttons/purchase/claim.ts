import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import { is_admin, is_staff } from "../../../functions/permissions"
import {
  purchase_claimed_by,
  purchase_log_channel_id,
  purchase_logs,
  purchase_ticket_ids,
  purchase_owners,
  purchase_staff,
  save_purchase_ticket,
} from "../../shared/ticket_state"
import { component, time, api, format } from "../../../utils"

export async function handle_purchase_claim(interaction: ButtonInteraction) {
  const member = interaction.member as GuildMember
  if (!is_admin(member) && !is_staff(member)) {
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

  let staff_list = purchase_staff.get(thread.id) || []
  if (!staff_list.includes(interaction.user.id)) {
    staff_list.push(interaction.user.id)
    purchase_staff.set(thread.id, staff_list)
  }

  await thread.send({
    content: `<@${interaction.user.id}> has claimed this ticket.`,
  })

  const log_message_id = purchase_logs.get(thread.id)
  const log_channel = interaction.client.channels.cache.get(purchase_log_channel_id) as TextChannel

  if (log_message_id && log_channel) {
    const owner_id = purchase_owners.get(thread.id) || "Unknown"
    const ticket_id = purchase_ticket_ids.get(thread.id) || "Unknown"
    const staff_mentions = staff_list.map((id: string) => `<@${id}>`)

    try {
      const owner = await interaction.guild?.members.fetch(owner_id).catch(() => null)
      const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Join Ticket`,
                  `a Purchase Ticket is Opened!`,
                  ``,
                  `- **Ticket ID:** ${format.code(ticket_id)}`,
                  `- **Opened by:** <@${owner_id}>`,
                  `- **Claimed by:** <@${interaction.user.id}>`,
                ],
                thumbnail: avatar_url,
              }),
              component.divider(),
              component.text([
                `- **Staff in Ticket:** ${staff_mentions.length}`,
                `- **Staff Members:** ${staff_mentions.join(" ") || "None"}`,
              ]),
              component.divider(),
              component.action_row(
                component.success_button("Join Ticket", `join_purchase_${thread.id}`)
              ),
            ],
          }),
        ],
      })

      await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
    } catch {}
  }

  await save_purchase_ticket(thread.id)

  await interaction.editReply({
    content: "You have claimed this ticket.",
  })
}
