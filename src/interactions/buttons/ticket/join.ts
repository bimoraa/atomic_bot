import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import {
  ticket_logs,
  ticket_staff,
  ticket_owners,
  ticket_ticket_ids,
  ticket_claimed_by,
  ticket_issues,
  priority_log_channel_id,
  save_priority_ticket,
} from "../../controllers/ticket_controller"
import { is_admin, is_staff } from "../../../services/permissions"
import { component, api, format } from "../../../utils"

export async function handle(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("join_ticket_")) return false

  const member = interaction.member as GuildMember
  if (!is_admin(member) && !is_staff(member)) {
    await interaction.reply({
      content: "Only staff can join tickets.",
      flags:   64,
    })
    return true
  }

  await interaction.deferReply({ flags: 32832 } as any)

  const thread_id = interaction.customId.replace("join_ticket_", "")
  const guild     = interaction.guild!

  const thread = guild.channels.cache.get(thread_id) as ThreadChannel
  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." })
    return true
  }

  let staff_list = ticket_staff.get(thread_id) || []
  if (staff_list.includes(member.id)) {
    const already_joined_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Already Joined`,
              `You have already joined this ticket.`,
            ]),
            component.action_row(
              component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, thread_id))
            ),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, already_joined_message)
    return true
  }

  await thread.members.add(member.id)

  staff_list.push(member.id)
  ticket_staff.set(thread_id, staff_list)

  const staff_mentions = staff_list.map((id: string) => `<@${id}>`)
  const owner_id       = ticket_owners.get(thread_id) || "Unknown"
  const ticket_id      = ticket_ticket_ids.get(thread_id) || "Unknown"
  const issue_type     = ticket_issues.get(thread_id) || "Not specified"

  const log_message_id = ticket_logs.get(thread_id)

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(priority_log_channel_id) as TextChannel
    if (log_channel) {
      try {
        const owner      = await guild.members.fetch(owner_id).catch(() => null)
        const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

        const claimed_by   = ticket_claimed_by.get(thread_id)
        const claimed_line = claimed_by ? `- **Claimed by:** <@${claimed_by}>` : `- **Claimed by:** Not claimed`

        const message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: [
                    `## Join Ticket`,
                    `A Priority Ticket is Opened!`,
                    ``,
                    `- **Ticket ID:** ${format.code(ticket_id)}`,
                    `- **Opened by:** <@${owner_id}>`,
                    `- **Issue:** ${issue_type}`,
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
                  component.success_button("Join Ticket", `join_ticket_${thread_id}`)
                ),
              ],
            }),
          ],
        })

        await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
      } catch {}
    }
  }

  await save_priority_ticket(thread_id)

  const reply_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`You have joined the ticket!`),
          component.divider(2),
          component.action_row(
            component.link_button("Jump to Ticket", format.channel_url(guild.id, thread_id))
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, { ...reply_message, flags: 32832 })
  return true
}
