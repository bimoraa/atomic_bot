import { ModalSubmitInteraction, GuildMember, TextChannel, ChannelType, ThreadAutoArchiveDuration } from "discord.js"
import {
  ticket_logs,
  ticket_owners,
  ticket_issues,
  ticket_descriptions,
  ticket_staff,
  ticket_ticket_ids,
  ticket_open_time,
  issue_labels,
  priority_log_channel_id,
  priority_ticket_parent_id,
  generate_ticket_id,
  save_priority_ticket,
} from "../../shared/ticket_state"
import { component, api, format, time } from "../../../utils"

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("ticket_modal_")) return false

  const issue_type  = interaction.customId.replace("ticket_modal_", "")
  const issue_label = issue_labels[issue_type] || issue_type
  const description = interaction.fields.getTextInputValue("ticket_description")

  const member = interaction.member as GuildMember
  const guild  = interaction.guild!
  const token  = api.get_token()

  await interaction.deferReply({ ephemeral: true })

  const parent_channel = guild.channels.cache.get(priority_ticket_parent_id) as TextChannel
  if (!parent_channel) {
    await interaction.editReply({ content: "Ticket channel not found." })
    return true
  }

  const thread = await parent_channel.threads.create({
    name:                `ticket-${member.user.username}`,
    type:                ChannelType.PrivateThread,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  })

  await thread.members.add(member.id)

  ticket_owners.set(thread.id, member.id)
  ticket_staff.set(thread.id, [])
  ticket_issues.set(thread.id, issue_label)
  ticket_descriptions.set(thread.id, description)

  const ticket_id = generate_ticket_id()
  ticket_ticket_ids.set(thread.id, ticket_id)

  const timestamp = time.now()
  ticket_open_time.set(thread.id, timestamp)

  const avatar_url = member.user.displayAvatarURL({ size: 128 })

  const welcome_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Priority Ticket`,
              `Welcome to your priority ticket, <@${member.id}>!`,
              ``,
              `- **Issue Type:** ${issue_label}`,
              `- **Description:** ${description}`,
              ``,
              `Our staff will assist you shortly.`,
            ],
            thumbnail: avatar_url,
          }),
          component.action_row(
            component.danger_button("Close Ticket", "ticket_close"),
            component.secondary_button("Close with Reason", "ticket_close_reason"),
            component.primary_button("Claim Ticket", "ticket_claim"),
            component.secondary_button("Add Member", "ticket_add_member")
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, token, welcome_message)

  const log_channel = guild.channels.cache.get(priority_log_channel_id) as TextChannel
  if (log_channel) {
    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Join Ticket`,
                `A Priority Ticket is Opened!`,
                ``,
                `- **Ticket ID:** ${format.code(ticket_id)}`,
                `- **Opened by:** <@${member.id}>`,
                `- **Issue:** ${issue_label}`,
                `- **Claimed by:** Not claimed`,
              ],
              thumbnail: avatar_url,
            }),
            component.divider(),
            component.text([
              `- **Staff in Ticket:** 0`,
              `- **Staff Members:** None`,
            ]),
            component.divider(),
            component.action_row(
              component.success_button("Join Ticket", `join_ticket_${thread.id}`)
            ),
          ],
        }),
      ],
    })

    const log_data = await api.send_components_v2(log_channel.id, token, log_message)

    if (log_data.id) {
      ticket_logs.set(thread.id, log_data.id)
    }
  }

  await save_priority_ticket(thread.id)

  const reply_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Ticket Created`,
            `Your ticket has been created successfully!`,
          ]),
          component.action_row(
            component.link_button("Jump to Ticket", format.channel_url(guild.id, thread.id))
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, reply_message)

  return true
}
