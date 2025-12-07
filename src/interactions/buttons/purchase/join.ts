import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import {
  purchase_logs,
  purchase_staff,
  purchase_owners,
  purchase_log_channel_id,
  purchase_ticket_ids,
  purchase_claimed_by,
  save_purchase_ticket,
} from "../../shared/ticket_state"
import { is_admin, is_staff } from "../../../functions/permissions"
import { component, api, format } from "../../../utils"

export async function handle_join_purchase(interaction: ButtonInteraction) {
  const member = interaction.member as GuildMember
  if (!is_admin(member) && !is_staff(member)) {
    await interaction.reply({
      content: "Only staff can join tickets.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const thread_id = interaction.customId.replace("join_purchase_", "")
  const guild = interaction.guild!

  const thread = guild.channels.cache.get(thread_id) as ThreadChannel
  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." })
    return
  }

  let staff_list = purchase_staff.get(thread_id) || []
  if (staff_list.includes(member.id)) {
    await interaction.editReply({ content: "You have already joined this ticket." })
    return
  }

  await thread.members.add(member.id)

  staff_list.push(member.id)
  purchase_staff.set(thread_id, staff_list)

  const staff_mentions = staff_list.map((id: string) => `<@${id}>`)
  const owner_id = purchase_owners.get(thread_id) || "Unknown"
  const ticket_id = purchase_ticket_ids.get(thread_id) || "Unknown"

  const log_message_id = purchase_logs.get(thread_id)

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(purchase_log_channel_id) as TextChannel
    if (log_channel) {
      try {
        const owner = await guild.members.fetch(owner_id).catch(() => null)
        const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

        const claimed_by = purchase_claimed_by.get(thread_id)
        const claimed_line = claimed_by ? `- **Claimed by:** <@${claimed_by}>` : `- **Claimed by:** Not claimed`

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
                    claimed_line,
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
                  component.success_button("Join Ticket", `join_purchase_${thread_id}`)
                ),
              ],
            }),
          ],
        })

        await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
      } catch {}
    }
  }

  await save_purchase_ticket(thread_id)

  await thread.send({
    content: `<@${member.id}> has joined the ticket.`,
  })

  await interaction.editReply({ content: `You have joined the ticket! <#${thread_id}>` })
}
