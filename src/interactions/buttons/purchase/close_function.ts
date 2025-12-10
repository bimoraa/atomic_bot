import { Client, TextChannel, ThreadChannel, User } from "discord.js"
import { remove_open_ticket } from "./open"
import {
  purchase_owners,
  purchase_staff,
  purchase_logs,
  purchase_ticket_ids,
  purchase_claimed_by,
  purchase_open_time,
  purchase_log_channel_id,
  purchase_closed_log_channel_id,
  delete_purchase_ticket,
  load_purchase_ticket,
} from "../../shared/ticket_state"
import { component, time, api, format } from "../../../utils"

interface CloseTicketOptions {
  thread: ThreadChannel
  client: Client
  closed_by: User | "System"
  reason?: string
}

export async function close_purchase_ticket_fn(options: CloseTicketOptions): Promise<void> {
  const { thread, client, closed_by, reason } = options

  await load_purchase_ticket(thread.id)

  const owner_id = purchase_owners.get(thread.id)
  const ticket_id = purchase_ticket_ids.get(thread.id) || "Unknown"
  const claimed_by = purchase_claimed_by.get(thread.id)
  const open_time = purchase_open_time.get(thread.id)
  const open_log_id = purchase_logs.get(thread.id)

  if (owner_id) {
    remove_open_ticket(owner_id)
    purchase_owners.delete(thread.id)
  }

  purchase_staff.delete(thread.id)
  purchase_logs.delete(thread.id)
  purchase_ticket_ids.delete(thread.id)
  purchase_claimed_by.delete(thread.id)
  purchase_open_time.delete(thread.id)

  await delete_purchase_ticket(thread.id)

  const timestamp = time.now()
  const token = api.get_token()

  const open_log_channel = client.channels.cache.get(purchase_log_channel_id) as TextChannel
  if (open_log_channel && open_log_id) {
    await api.delete_message(open_log_channel.id, open_log_id, token)
  }

  const close_log_channel = await client.channels.fetch(purchase_closed_log_channel_id) as TextChannel
  if (close_log_channel) {
    let owner_avatar = format.default_avatar
    if (owner_id) {
      try {
        const owner = await client.users.fetch(owner_id)
        owner_avatar = owner.displayAvatarURL({ size: 128 })
      } catch {}
    }

    const thread_url = `https://discord.com/channels/${thread.guildId}/${thread.id}`
    const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`

    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Purchase Ticket Closed`,
                `A purchase ticket has been closed.`,
              ],
              thumbnail: owner_avatar,
            }),
            component.divider(),
            component.text([
              `- **Ticket ID:** ${format.code(ticket_id)}`,
              `- **Opened By:** ${owner_id ? `<@${owner_id}>` : "Unknown"}`,
              `- **Closed By:** ${closed_by_text}`,
            ]),
            component.divider(),
            component.text([
              `- **Open Time:** ${open_time ? time.full_date_time(open_time) : "Unknown"}`,
              `- **Claimed By:** ${claimed_by ? `<@${claimed_by}>` : "Not claimed"}`,
              `- **Reason:** ${reason || "-"}`,
            ]),
            component.divider(),
            component.action_row(
              component.link_button("View Thread", thread_url)
            ),
          ],
        }),
      ],
    })

    await api.send_components_v2(close_log_channel.id, token, log_message)
  }

  if (owner_id) {
    try {
      const owner = await client.users.fetch(owner_id)
      const dm_channel = await owner.createDM()

      const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`

      const dm_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## Purchase Ticket Closed`,
                ``,
                `Your purchase ticket has been closed.`,
                ``,
                `- **Ticket ID:** ${format.code(ticket_id)}`,
                `- **Closed by:** ${closed_by_text}`,
                `- **Reason:** ${reason || "-"}`,
                `- **Closed:** ${time.full_date_time(timestamp)}`,
                ``,
                `Thank you for using our service!`,
              ]),
              component.action_row(
                component.link_button("View Ticket", `https://discord.com/channels/${thread.guildId}/${thread.id}`)
              ),
            ],
          }),
        ],
      })

      await api.send_components_v2(dm_channel.id, token, dm_message)
    } catch {}
  }

  const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`
  
  const close_thread_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Ticket Closed`,
            `This ticket has been closed by ${closed_by_text}.`,
            ...(reason ? [``, `**Reason:** ${reason}`] : []),
          ]),
          component.divider(),
          component.action_row(
            component.secondary_button("Reopen This Ticket", "purchase_reopen")
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, token, close_thread_message)

  await thread.setLocked(true)
  await thread.setArchived(true)
}
