import {
  ButtonInteraction,
  TextChannel,
  ChannelType,
  ThreadAutoArchiveDuration,
} from "discord.js"
import {
  purchase_log_channel_id,
  purchase_logs,
  purchase_staff,
  purchase_owners,
  purchase_ticket_ids,
  purchase_open_time,
  generate_ticket_id,
  purchase_ticket_parent_id,
  save_purchase_ticket,
} from "../../shared/ticket_state"
import { component, time, api, format } from "../../../utils"

const open_tickets: Map<string, string> = new Map()

function get_user_open_ticket(user_id: string): string | null {
  if (open_tickets.has(user_id)) {
    return open_tickets.get(user_id)!
  }
  
  for (const [thread_id, owner_id] of purchase_owners.entries()) {
    if (owner_id === user_id) {
      open_tickets.set(user_id, thread_id)
      return thread_id
    }
  }
  
  return null
}

export async function handle_purchase_open(interaction: ButtonInteraction) {
  const user_id = interaction.user.id
  const existing_ticket_id = get_user_open_ticket(user_id)

  if (existing_ticket_id) {
    await interaction.deferReply({ flags: 64 })

    const already_open_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Already Have Ticket`,
              `You already have an open purchase ticket.`,
              `Please close it first before opening a new one.`,
            ]),
            component.action_row(
              component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, existing_ticket_id))
            ),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, already_open_message)
    return
  }

  await interaction.deferReply({ flags: 64 })

  const ticket_channel = interaction.client.channels.cache.get(purchase_ticket_parent_id) as TextChannel
  if (!ticket_channel) {
    await interaction.editReply({ content: "Ticket channel not found." })
    return
  }

  const thread = await ticket_channel.threads.create({
    name: `purchase-${interaction.user.username}`,
    type: ChannelType.PrivateThread,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  })

  await thread.members.add(user_id)

  open_tickets.set(user_id, thread.id)
  purchase_owners.set(thread.id, user_id)
  purchase_staff.set(thread.id, [])

  const ticket_id = generate_ticket_id()
  purchase_ticket_ids.set(thread.id, ticket_id)

  const timestamp = time.now()
  purchase_open_time.set(thread.id, timestamp)

  const avatar_url = interaction.user.displayAvatarURL({ size: 128 })
  const token = api.get_token()

  const welcome_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Purchase Ticket`,
              `Welcome to your purchase ticket, <@${user_id}>!`,
              ``,
              `Please tell us which script you want to purchase and your preferred payment method.`,
              ``,
              `Our staff will assist you shortly.`,
            ],
            thumbnail: avatar_url,
          }),
          component.action_row(
            component.danger_button("Close Ticket", "purchase_close"),
            component.secondary_button("Close with Reason", "purchase_close_reason"),
            component.primary_button("Claim Ticket", "purchase_claim"),
            component.secondary_button("Add Member", "purchase_add_member")
          ),
        ],
      }),
    ],
  })

  const welcome_data = await api.send_components_v2(thread.id, token, welcome_message)
  console.log("[purchase] Welcome panel sent:", welcome_data.id ? "success" : "failed")

  const log_channel = interaction.client.channels.cache.get(purchase_log_channel_id) as TextChannel
  if (log_channel) {
    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Join Ticket`,
                `a Purchase Ticket is Opened!`,
                ``,
                `- **Ticket ID:** ${format.code(ticket_id)}`,
                `- **Opened by:** <@${user_id}>`,
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
            component.action_row(component.success_button("Join Ticket", `join_purchase_${thread.id}`)),
          ],
        }),
      ],
    })

    const log_data = (await api.send_components_v2(log_channel.id, token, log_message)) as { id?: string }
    if (log_data.id) {
      purchase_logs.set(thread.id, log_data.id)
    }
  }

  await save_purchase_ticket(thread.id)

  try {
    const dm_channel = await interaction.user.createDM()
    const dm_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## <:ticket:1411878131366891580> Purchase Ticket Opened`,
              ``,
              `Your purchase ticket has been created!`,
              ``,
              `- **Ticket ID:** ${format.code(ticket_id)}`,
              `- **Opened:** ${time.full_date_time(timestamp)}`,
              ``,
              `Please check the ticket thread to continue.`,
            ]),
            component.action_row(component.link_button("View Ticket", format.channel_url(interaction.guildId!, thread.id))),
          ],
        }),
      ],
    })

    await api.send_components_v2(dm_channel.id, token, dm_message)
  } catch {}

  const reply_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Purchase Ticket Created`,
            `Your purchase ticket has been created.`,
          ]),
          component.action_row(
            component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, thread.id))
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, reply_message)
}

export function remove_open_ticket(user_id: string) {
  open_tickets.delete(user_id)
}

export function has_open_ticket(user_id: string): boolean {
  return open_tickets.has(user_id)
}
