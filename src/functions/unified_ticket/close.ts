import { Client, TextChannel, ThreadChannel, User } from "discord.js"
import {
  get_ticket_config,
  get_ticket,
  delete_ticket,
  remove_user_open_ticket,
  delete_ticket_db,
  load_ticket,
} from "./state"
import { component, time, api, format } from "../../utils"

interface CloseTicketOptions {
  thread:    ThreadChannel
  client:    Client
  closed_by: User | "System"
  reason?:   string
}

export async function close_ticket(options: CloseTicketOptions): Promise<void> {
  const { thread, client, closed_by, reason } = options

  await load_ticket(thread.id)

  const data = get_ticket(thread.id)
  if (!data) {
    await thread.setLocked(true)
    await thread.setArchived(true)
    return
  }

  const config = get_ticket_config(data.ticket_type)
  if (!config) {
    await thread.setLocked(true)
    await thread.setArchived(true)
    return
  }

  const owner_id     = data.owner_id
  const ticket_id    = data.ticket_id || "Unknown"
  const claimed_by   = data.claimed_by
  const open_time    = data.open_time
  const open_log_id  = data.log_message_id
  const issue_type   = data.issue_type
  const description  = data.description

  if (owner_id) {
    remove_user_open_ticket(data.ticket_type, owner_id)
  }

  delete_ticket(thread.id)
  await delete_ticket_db(thread.id)

  const timestamp = time.now()
  const token     = api.get_token()

  const open_log_channel = client.channels.cache.get(config.log_channel_id) as TextChannel
  if (open_log_channel && open_log_id) {
    await api.delete_message(open_log_channel.id, open_log_id, token)
  }

  const close_log_channel = await client.channels.fetch(config.closed_log_channel_id) as TextChannel
  if (close_log_channel) {
    let owner_avatar = format.default_avatar
    if (owner_id) {
      try {
        const owner  = await client.users.fetch(owner_id)
        owner_avatar = owner.displayAvatarURL({ size: 128 })
      } catch {}
    }

    const thread_url      = `https://discord.com/channels/${thread.guildId}/${thread.id}`
    const closed_by_text  = closed_by === "System" ? "System" : `<@${closed_by.id}>`

    let log_content_1 = [
      `- **Ticket ID:** ${format.code(ticket_id)}`,
      `- **Opened By:** ${owner_id ? `<@${owner_id}>` : "Unknown"}`,
      `- **Closed By:** ${closed_by_text}`,
    ]

    let log_content_2 = [
      `- **Open Time:** ${open_time ? time.full_date_time(open_time) : "Unknown"}`,
      `- **Claimed By:** ${claimed_by ? `<@${claimed_by}>` : "Not claimed"}`,
      `- **Reason:** ${reason || "-"}`,
    ]

    if (issue_type) {
      log_content_2.unshift(`- **Issue Type:** ${issue_type}`)
    }

    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## ${config.name} Ticket Closed`,
                `A ${config.name.toLowerCase()} ticket has been closed.`,
              ],
              thumbnail: owner_avatar,
            }),
            component.divider(),
            component.text(log_content_1),
            component.divider(),
            component.text(log_content_2),
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
      const owner      = await client.users.fetch(owner_id)
      const dm_channel = await owner.createDM()

      const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`

      const dm_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## ${config.name} Ticket Closed`,
                ``,
                `Your ${config.name.toLowerCase()} ticket has been closed.`,
                ``,
                `- **Ticket ID:** ${format.code(ticket_id)}`,
                ...(issue_type ? [`- **Issue Type:** ${issue_type}`] : []),
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
            component.secondary_button("Reopen This Ticket", `${config.prefix}_reopen`)
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, token, close_thread_message)

  await thread.setLocked(true)
  await thread.setArchived(true)
}
