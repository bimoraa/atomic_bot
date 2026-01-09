import { ButtonInteraction, ThreadChannel, GuildMember } from "discord.js"
import { component, api, db } from "../../../../shared/utils"
import { get_ticket, ticket_types } from "../../../../shared/database/unified_ticket"
import { close_ticket_by_deadline, cancel_close_request, get_close_request } from "../../../../modules/staff/staff/close_request"

function get_ticket_parent_ids(): string[] {
  return Object.values(ticket_types).map(config => config.ticket_parent_id)
}

export async function handle_close_request_accept(interaction: ButtonInteraction): Promise<void> {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || !get_ticket_parent_ids().includes(thread.parentId || "")) {
    await interaction.reply({
      content: "This button can only be used in a ticket thread.",
      ephemeral: true,
    })
    return
  }

  const data     = get_ticket(thread.id)
  const owner_id = data?.owner_id
  if (member.id !== owner_id) {
    await interaction.reply({
      content: "Only the ticket owner can accept or deny close requests.",
      ephemeral: true,
    })
    return
  }

  await interaction.deferUpdate()

  const request = await get_close_request(thread.id)
  const reason  = request?.reason || "Accepted by owner"

  if (request?.message_id) {
    await api.delete_message(thread.id, request.message_id, api.get_token())
  }

  await close_ticket_by_deadline(thread, reason)
}

export async function handle_close_request_deny(interaction: ButtonInteraction): Promise<void> {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || !get_ticket_parent_ids().includes(thread.parentId || "")) {
    await interaction.reply({
      content: "This button can only be used in a ticket thread.",
      ephemeral: true,
    })
    return
  }

  const data     = get_ticket(thread.id)
  const owner_id = data?.owner_id
  if (member.id !== owner_id) {
    await interaction.reply({
      content: "Only the ticket owner can accept or deny close requests.",
      ephemeral: true,
    })
    return
  }

  await interaction.deferUpdate()

  const request = await get_close_request(thread.id)

  await cancel_close_request(thread.id)

  if (request?.message_id) {
    await api.delete_message(thread.id, request.message_id, api.get_token())
  }

  const denied_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Close Request Denied`,
            `<@${member.id}> has denied the close request.`,
            `The ticket will remain open.`,
          ]),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, api.get_token(), denied_message)
}
