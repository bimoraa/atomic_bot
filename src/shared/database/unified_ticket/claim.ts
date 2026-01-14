import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import { is_admin, is_staff } from "../settings/permissions"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  save_ticket,
  load_ticket,
} from "./state"
import { component, api, format } from "../../utils"

const HELPER_ROLE_ID = "1357767950421065981"

export async function claim_ticket(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const member    = interaction.member as GuildMember
  const is_helper = member.roles.cache.has(HELPER_ROLE_ID)
  
  if (ticket_type === "helper") {
    if (!is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.editReply({ content: "Only staff and helpers can claim helper tickets." })
      return
    }
  } else {
    if (!is_admin(member) && !is_staff(member)) {
      await interaction.editReply({ content: "Only staff can claim tickets." })
      return
    }
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return
  }

  let data = get_ticket(thread.id)
  
  // - FALLBACK: LOAD FROM DATABASE - \\
  if (!data) {
    const loaded = await load_ticket(thread.id)
    if (!loaded) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
    data = get_ticket(thread.id)
    if (!data) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
  }

  if (data.claimed_by) {
    await interaction.editReply({ content: `This ticket has already been claimed by <@${data.claimed_by}>.` })
    return
  }

  await thread.members.add(interaction.user.id)
  data.claimed_by = interaction.user.id

  if (!data.staff.includes(interaction.user.id)) {
    data.staff.push(interaction.user.id)
  }

  set_ticket(thread.id, data)

  // - PARALLEL OPERATIONS - \\
  const parallel_tasks: Promise<any>[] = [
    thread.send({ content: `<@${interaction.user.id}> has claimed this ticket.` }).catch(() => {})
  ]

  const log_message_id = data.log_message_id
  const log_channel    = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel

  if (log_message_id && log_channel) {
    const staff_mentions = data.staff.map((id: string) => `<@${id}>`)

    const update_task = interaction.guild?.members.fetch(data.owner_id)
    if (update_task) {
      const task_promise = update_task
        .then(owner => {
          const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

          let log_content = [
            `## Join Ticket`,
            `A ${config.name} Ticket is Opened!`,
            ``,
            `- **Ticket ID:** ${format.code(data.ticket_id)}`,
            `- **Opened by:** <@${data.owner_id}>`,
          ]

          if (data.issue_type) {
            log_content.push(`- **Issue:** ${data.issue_type}`)
          }

          log_content.push(`- **Claimed by:** <@${interaction.user.id}>`)

          const message = component.build_message({
            components: [
              component.container({
                components: [
                  component.section({
                    content: log_content,
                    thumbnail: avatar_url,
                  }),
                  component.divider(),
                  component.text([
                    `- **Staff in Ticket:** ${staff_mentions.length}`,
                    `- **Staff Members:** ${staff_mentions.join(" ") || "None"}`,
                  ]),
                  component.divider(),
                  component.action_row(
                    component.success_button("Join Ticket", `${config.prefix}_join_${thread.id}`)
                  ),
                ],
              }),
            ],
          })

          return api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
        })
        .catch(() => {})
      
      parallel_tasks.push(task_promise)
    }
  }

  // - NO AWAIT FOR FASTER RESPONSE - \\\\
  save_ticket(thread.id)
  interaction.editReply({ content: "You have claimed this ticket." })
  
  // - WAIT FOR PARALLEL TASKS IN BACKGROUND - \\\\
  Promise.allSettled(parallel_tasks).catch(() => {})
}
