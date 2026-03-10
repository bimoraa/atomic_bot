/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, TextChannel, ThreadChannel, User } from "discord.js"
import {
  get_ticket_config,
  get_ticket,
  delete_ticket,
  remove_user_open_ticket,
  delete_ticket_db,
  load_ticket,
}                                                    from "@shared/database/unified_ticket/state"
import { component, api, format, transcript, time } from "@shared/utils"
import { log_error }                                from "@shared/utils/error_logger"

interface CloseTicketOptions {
  thread: ThreadChannel
  client: Client
  closed_by: User | "System"
  reason?: string
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

  const owner_id = data.owner_id
  const ticket_id = data.ticket_id || "Unknown"
  const claimed_by = data.claimed_by
  const open_time = data.open_time
  const open_log_id = data.log_message_id
  const issue_type = data.issue_type
  const description = data.description

  // - Get mapped issue type label if middleman, else use raw issue type - \\
  let display_issue_type = issue_type
  if (data.ticket_type === "middleman" && issue_type) {
    const range_labels: Record<string, string> = {
      "dVzaCndYpO": "Rp 10.000 – Rp 50.000",
      "laf8By4Gtm": "Rp 51.000 – Rp 100.000",
      "1FS1PRT0Ys": "Rp 101.000 – Rp 200.000",
      "WnGoXX4HnQ": "Rp 201.000 – Rp 300.000",
      "PIMLKDohan": "≥ Rp 300.000"
    }
    if (range_labels[issue_type]) {
      display_issue_type = range_labels[issue_type]
    }
  }

  // - WEB_URL should point to Next.js web app (Vercel), not bot server - \\
  const web_url = process.env.WEB_URL || "https://maxime.vercel.app"
  const full_url = web_url.startsWith("http") ? web_url : `https://${web_url}`

  if (owner_id) {
    remove_user_open_ticket(data.ticket_type, owner_id)
  }

  delete_ticket(thread.id)
  await delete_ticket_db(thread.id)

  const timestamp = time.now()
  const token = api.get_token()
  let transcript_id: string | null = null

  console.log(`[ - TRANSCRIPT GENERATION - ] Starting for ticket: ${ticket_id}`)
  console.log(`[ - TRANSCRIPT GENERATION - ] Thread ID: ${thread.id}`)
  console.log(`[ - TRANSCRIPT GENERATION - ] Owner ID: ${owner_id}`)

  // - PARALLEL OPERATIONS - \\
  const parallel_tasks = []

  // - TRANSCRIPT GENERATION - \\
  const transcript_promise = transcript.generate_transcript(
    thread,
    client,
    ticket_id,
    data.ticket_type,
    owner_id,
    open_time,
    closed_by === "System" ? "System" : closed_by.id,
    claimed_by,
    issue_type,
    description
  )
    .then(id => {
      transcript_id = id
      console.log(`[ - TRANSCRIPT GENERATED - ] Ticket: ${ticket_id}, Transcript: ${transcript_id}`)
    })
    .catch(error => {
      console.error(`[ - TRANSCRIPT ERROR - ] Ticket: ${ticket_id}`)
      console.error(`[ - TRANSCRIPT ERROR - ] Error:`, error)
      if (error instanceof Error) {
        log_error(client, error, "Ticket Transcript Generation", { ticket_id, thread_id: thread.id })
      } else {
        log_error(client, new Error(String(error)), "Ticket Transcript Generation", { ticket_id, thread_id: thread.id })
      }
    })

  parallel_tasks.push(transcript_promise)

  // - DELETE OPEN LOG - \\
  const open_log_channel = client.channels.cache.get(config.log_channel_id) as TextChannel
  if (open_log_channel && open_log_id) {
    parallel_tasks.push(
      api.delete_message(open_log_channel.id, open_log_id, token).catch(() => { })
    )
  }

  // - WAIT FOR TRANSCRIPT BEFORE SENDING LOGS - \\
  await Promise.allSettled(parallel_tasks)

  console.log(`[ - TICKET CLOSE LOG - ] Attempting to send for ticket: ${ticket_id}`)
  console.log(`[ - TICKET CLOSE LOG - ] Channel ID: ${config.closed_log_channel_id}`)

  // - PARALLEL NOTIFICATION TASKS - \\
  const notification_tasks = []

  // - CLOSE LOG - \\
  notification_tasks.push(
    client.channels.fetch(config.closed_log_channel_id)
      .then(async (channel) => {
        if (!channel) {
          const err = new Error(`Channel not found: ${config.closed_log_channel_id}`)
          console.error(`[ - TICKET CLOSE LOG ERROR - ] ${err.message}`)
          log_error(client, err, "Ticket Close Log", { ticket_id, channel_id: config.closed_log_channel_id })
          return
        }

        const close_log_channel = channel as TextChannel
        console.log(`[ - TICKET CLOSE LOG - ] Channel fetched: ${close_log_channel.name} (${close_log_channel.id})`)

        let owner_avatar = format.default_avatar
        if (owner_id) {
          try {
            const owner = await client.users.fetch(owner_id)
            owner_avatar = owner.displayAvatarURL({ size: 128 })
          } catch { }
        }

        const thread_url = `https://discord.com/channels/${thread.guildId}/${thread.id}`
        const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`

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

        if (display_issue_type) {
          log_content_2.unshift(`- **Issue Type:** ${display_issue_type}`)
        }

        const transcript_buttons = transcript_id
          ? [component.link_button("View Transcript", `${full_url}/transcript/${transcript_id}`)]
          : []

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
                  component.link_button("View Thread", thread_url),
                  ...transcript_buttons
                ),
              ],
            }),
          ],
        })

        console.log(`[ - TICKET CLOSE LOG - ] Sending message to channel: ${close_log_channel.id}`)
        const response = await api.send_components_v2(close_log_channel.id, token, log_message)
        console.log(`[ - TICKET CLOSE LOG - ] API Response:`, response)
        console.log(`[ - TICKET CLOSE LOG - ] Successfully sent for ticket: ${ticket_id}`)
      })
      .catch(error => {
        console.error(`[ - TICKET CLOSE LOG ERROR - ] Ticket: ${ticket_id}`)
        console.error(`[ - TICKET CLOSE LOG ERROR - ] Error details:`, error)
        if (error instanceof Error) {
          log_error(client, error, "Ticket Close Log", { ticket_id, channel_id: config.closed_log_channel_id })
        } else {
          log_error(client, new Error(String(error)), "Ticket Close Log", { ticket_id, channel_id: config.closed_log_channel_id })
        }
      })
  )

  // - SEND DM TO OWNER - \\
  if (owner_id) {
    notification_tasks.push(
      client.users.fetch(owner_id)
        .then(async owner => {
          const dm_channel = await owner.createDM()
          const closed_by_text = closed_by === "System" ? "System" : `<@${closed_by.id}>`
          const dm_transcript_buttons = transcript_id
            ? [component.link_button("View Transcript", `${full_url}/transcript/${transcript_id}`)]
            : []

          const dm_message = component.build_message({
            components: [
              component.container({
                components: [
                  component.text(`## <:ticket:1411878131366891580> - ${config.name} Ticket Closed\nYour ${config.name.toLowerCase()} ticket has been closed.`),
                ],
              }),
              component.container({
                components: [
                  component.text([
                    `- **Ticket ID:** ${format.code(ticket_id)}`,
                    ...(display_issue_type ? [`- **Issue Type:** ${display_issue_type}`] : []),
                    `- **Closed by:** ${closed_by_text}`,
                    `- **Reason:** ${reason || "Closed by staff"}`,
                    `- **Closed at:** ${time.full_date_time(timestamp)}`,
                  ]),
                ],
                accent_color: 32768, // To give it a clean look if needed, or leave default. We use a container without text initially, wait, spoiler: true is requested.
              }),
              // - Let's adjust to match exact JSON request layout - \\
            ],
          })
          
          // Re-building dm_message to exactly match the requested payload structure (spoiler flag isn't directly in container but we can simulate or we use standard container)
          const new_dm_message = component.build_message({
            components: [
              component.container({
                components: [
                  component.text(`## <:ticket:1411878131366891580> - ${config.name} Ticket Closed\nYour ${config.name.toLowerCase()} ticket has been closed.`),
                ],
              }),
              {
                type: 17,
                components: [
                  component.text([
                    `- **Ticket ID:** \`${ticket_id}\``,
                    ...(display_issue_type ? [`- **Issue Type:** ${display_issue_type}`] : []),
                    `- **Closed by:** ${closed_by_text}`,
                    `- **Reason:** ${reason || "Closed by staff"}`,
                    `- **Closed at:** ${time.full_date_time(timestamp)}`,
                  ])
                ],
                spoiler: true
              },
              ...(dm_transcript_buttons.length > 0 ? [
                component.container({
                  components: [
                    component.action_row(...dm_transcript_buttons)
                  ]
                })
              ] : [])
            ]
          })

          await api.send_components_v2(dm_channel.id, token, new_dm_message)
        })
        .catch(() => { })
    )
  }

  // - SEND CLOSE MESSAGE IN THREAD - \\
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

  notification_tasks.push(
    api.send_components_v2(thread.id, token, close_thread_message).catch(() => { })
  )

  // - WAIT FOR ALL NOTIFICATIONS - \\
  await Promise.allSettled(notification_tasks)

  await thread.setLocked(true)
  await thread.setArchived(true)
}
