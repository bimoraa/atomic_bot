import { ButtonInteraction, ThreadChannel, GuildMember } from "discord.js"
import { component, api, db } from "../../../utils"
import { purchase_owners, purchase_ticket_parent_id } from "../../shared/ticket_state"
import { close_purchase_ticket, cancel_close_request, get_close_request } from "../../../commands/tools/close_request"

export async function handle_close_request_accept(interaction: ButtonInteraction): Promise<void> {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || thread.parentId !== purchase_ticket_parent_id) {
    await interaction.reply({
      content: "This button can only be used in a purchase ticket thread.",
      ephemeral: true,
    })
    return
  }

  const owner_id = purchase_owners.get(thread.id)
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

  await close_purchase_ticket(thread, reason)
}

export async function handle_close_request_deny(interaction: ButtonInteraction): Promise<void> {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || thread.parentId !== purchase_ticket_parent_id) {
    await interaction.reply({
      content: "This button can only be used in a purchase ticket thread.",
      ephemeral: true,
    })
    return
  }

  const owner_id = purchase_owners.get(thread.id)
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
