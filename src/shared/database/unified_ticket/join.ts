import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import { is_admin, is_staff } from "../settings/permissions"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  save_ticket,
} from "./state"
import { component, api, format } from "../../utils"

const HELPER_ROLE_ID = "1357767950421065981"

export async function join_ticket(interaction: ButtonInteraction, ticket_type: string, thread_id: string): Promise<void> {
  await interaction.deferReply({ flags: 32832 } as any)

  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const member     = interaction.member as GuildMember
  const is_helper  = member.roles.cache.has(HELPER_ROLE_ID)
  
  if (ticket_type === "helper") {
    if (!is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.editReply({ content: "Only staff and helpers can join helper tickets." })
      return
    }
  } else {
    if (!is_admin(member) && !is_staff(member)) {
      await interaction.editReply({ content: "Only staff can join tickets." })
      return
    }
  }

  const guild  = interaction.guild!
  const thread = guild.channels.cache.get(thread_id) as ThreadChannel

  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." })
    return
  }

  const data = get_ticket(thread_id)
  if (!data) {
    await interaction.editReply({ content: "Ticket data not found." })
    return
  }

  if (data.staff.includes(member.id)) {
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
    return
  }

  await thread.members.add(member.id)

  data.staff.push(member.id)
  set_ticket(thread_id, data)

  const staff_mentions = data.staff.map((id: string) => `<@${id}>`)
  const log_message_id = data.log_message_id

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(config.log_channel_id) as TextChannel
    if (log_channel) {
      try {
        const owner      = await guild.members.fetch(data.owner_id).catch(() => null)
        const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

        const claimed_line = data.claimed_by ? `- **Claimed by:** <@${data.claimed_by}>` : `- **Claimed by:** Not claimed`

        let log_content = [
          `## Join Ticket`,
          `A ${config.name} Ticket is Opened!`,
          ``,
          `- **Ticket ID:** ${format.code(data.ticket_id)}`,
          `- **Type:** ${config.name}`,
          `- **Opened by:** <@${data.owner_id}>`,
        ]

        if (data.issue_type) {
          log_content.push(`- **Issue:** ${data.issue_type}`)
        }

        log_content.push(claimed_line)

        let description_section: any[] = []
        if (data.description) {
          description_section = [
            component.divider(),
            component.text([
              `**Description:**`,
              `${data.description}`,
            ]),
          ]
        }

        const message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: log_content,
                  thumbnail: avatar_url,
                }),
                ...description_section,
                component.divider(),
                component.text([
                  `- **Staff in Ticket:** ${staff_mentions.length}`,
                  `- **Staff Members:** ${staff_mentions.join(" ") || "None"}`,
                ]),
                component.divider(),
                component.action_row(
                  component.success_button("Join Ticket", `${config.prefix}_join_${thread_id}`)
                ),
              ],
            }),
          ],
        })

        await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
      } catch {}
    }
  }

  await save_ticket(thread_id)

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
}
