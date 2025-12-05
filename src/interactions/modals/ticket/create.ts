import { ModalSubmitInteraction, GuildMember, TextChannel, ChannelType } from "discord.js"
import {
  ticket_logs,
  ticket_avatars,
  ticket_owners,
  ticket_issues,
  ticket_descriptions,
  issue_labels,
  log_channel_id,
  ticket_channel_id,
} from "../../shared/ticket_state"
import { component, api } from "../../../utils"

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("ticket_modal_")) return false

  const issue_type = interaction.customId.replace("ticket_modal_", "")
  const issue_label = issue_labels[issue_type] || issue_type
  const description = interaction.fields.getTextInputValue("ticket_description")

  const member = interaction.member as GuildMember
  const guild = interaction.guild!
  const token = api.get_token()

  await interaction.deferReply({ ephemeral: true })

  const parent_channel = guild.channels.cache.get(ticket_channel_id) as TextChannel
  if (!parent_channel) {
    await interaction.editReply({ content: "Ticket channel not found." })
    return true
  }

  const thread_name = `ticket-${member.user.username}-${Date.now().toString(36)}`

  const thread = await parent_channel.threads.create({
    name: thread_name,
    type: ChannelType.PrivateThread,
    invitable: false,
  })

  await thread.members.add(member.id)

  const welcome_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Ticket Created`,
              `**User:** <@${member.id}>`,
              `**Issue:** ${issue_label}`,
              `**Description:**`,
              `${description}`,
              ``,
              `Please wait for a staff member to assist you.`,
            ],
            thumbnail: member.user.displayAvatarURL(),
          }),
          component.action_row(component.danger_button("Close Ticket", "close_ticket")),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, token, welcome_message)

  const log_channel = guild.channels.cache.get(log_channel_id) as TextChannel
  if (log_channel) {
    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Join Ticket`,
                `a Priority Support Ticket is Opened!`,
                ``,
                `- Opened by: <@${member.id}>`,
                `- Issue: ${issue_label}`,
                `- Description: ${description}`,
              ],
              thumbnail: member.user.displayAvatarURL(),
            }),
            component.divider(),
            component.text([
              `- Staff in Ticket: 0`,
              `- Staff Members: None`,
            ]),
            component.action_row(component.success_button("Join Ticket", `join_ticket_${thread.id}`)),
          ],
        }),
      ],
    })

    const log_data = await api.send_components_v2(log_channel.id, token, log_message)

    if (log_data.id) {
      ticket_logs.set(thread.id, log_data.id)
      ticket_avatars.set(thread.id, member.user.displayAvatarURL())
      ticket_owners.set(thread.id, member.id)
      ticket_issues.set(thread.id, issue_label)
      ticket_descriptions.set(thread.id, description)
    }
  }

  await interaction.editReply({
    content: `Ticket created! <#${thread.id}>`,
  })

  return true
}
