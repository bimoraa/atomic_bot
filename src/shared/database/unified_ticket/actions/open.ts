import {
  ButtonInteraction,
  TextChannel,
  ChannelType,
  ThreadAutoArchiveDuration,
  Client,
} from "discord.js"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  get_user_open_ticket,
  set_user_open_ticket,
  remove_user_open_ticket,
  generate_ticket_id,
  save_ticket,
  save_ticket_immediate,
  build_ticket_panel,
  build_ticket_log_message,
  TicketData,
} from "../state"
import { component, format, time } from "../../../utils"
import type { message_payload } from "../../../utils"
import { log_error } from "../../utils/error_logger"

interface OpenTicketOptions {
  interaction: ButtonInteraction
  ticket_type: string
  issue_type?: string
  description?: string
}

/**
 * @description Build thread limit message
 * @param channel_id - Parent channel ID
 * @returns Message payload
 */
function build_thread_limit_message(channel_id: string): message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "## Ticket Limit Reached",
            "Ticket tidak bisa dibuat karena thread aktif sudah mencapai batas.",
            "Silakan tunggu atau minta staff untuk mengarsipkan ticket lama.",
            `Parent Channel: <#${channel_id}>`,
          ]),
        ],
      }),
    ],
  })
}

/**
 * @description Build simple error message
 * @param text - Message text
 * @returns Message payload
 */
function build_simple_error_message(text: string): message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [component.text(text)],
      }),
    ],
  })
}

/**
 * @description Archive oldest active threads to free slots
 * @param channel - Ticket parent channel
 * @param limit - Max threads to archive
 * @returns Number of threads archived
 */
async function archive_oldest_threads(channel: TextChannel, limit: number): Promise<number> {
  const active = await channel.threads.fetchActive()

  const sorted = [...active.threads.values()]
    .filter(thread => !thread.archived)
    .sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0))

  const to_archive = sorted.slice(0, limit)
  let archived_count = 0

  for (const thread of to_archive.values()) {
    try {
      await thread.setLocked(true)
      await thread.setArchived(true)
      archived_count++
    } catch (error) {
      log_error(channel.client, error as Error, "open_ticket_archive_oldest", {
        thread_id: thread.id,
        channel_id: channel.id,
      })
    }
  }

  return archived_count
}

export async function open_ticket(options: OpenTicketOptions): Promise<void> {
  const { interaction, ticket_type, issue_type, description } = options
  const config = get_ticket_config(ticket_type)

  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const user_id = interaction.user.id
  const existing_thread_id = get_user_open_ticket(ticket_type, user_id)

  if (existing_thread_id) {
    try {
      const thread = await interaction.client.channels.fetch(existing_thread_id)
      if (thread && thread.isThread() && !thread.locked && !thread.archived) {
        const already_open_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `## Already Have Ticket`,
                  `You already have an open ${config.name.toLowerCase()} ticket.`,
                  `Please close it first before opening a new one.`,
                ]),
                component.action_row(
                  component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, existing_thread_id))
                ),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, already_open_message)
        return
      }
      remove_user_open_ticket(ticket_type, user_id)
    } catch {
      remove_user_open_ticket(ticket_type, user_id)
    }
  }

  const ticket_channel = interaction.client.channels.cache.get(config.ticket_parent_id) as TextChannel
  if (!ticket_channel) {
    await interaction.editReply({ content: "Ticket channel not found." })
    return
  }

  let thread: any = null

  try {
    thread = await ticket_channel.threads.create({
      name: `${config.thread_prefix}-${interaction.user.username}`,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    })
  } catch (error: any) {
    if (error?.code === 160006) {
      const archived = await archive_oldest_threads(ticket_channel, 50)

      if (archived > 0) {
        try {
          thread = await ticket_channel.threads.create({
            name: `${config.thread_prefix}-${interaction.user.username}`,
            type: ChannelType.PrivateThread,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
          })
        } catch (retry_error: any) {
          log_error(interaction.client, retry_error as Error, "open_ticket_thread_limit_retry", {
            channel_id: ticket_channel.id,
            ticket_type: ticket_type,
            archived_count: archived,
          })
        }
      }

      if (!thread) {
        await api.edit_deferred_reply(interaction, build_thread_limit_message(ticket_channel.id))
        return
      }
    } else {
      log_error(interaction.client, error as Error, "open_ticket_create_thread", {
        channel_id: ticket_channel.id,
        ticket_type: ticket_type,
      })
      await api.edit_deferred_reply(interaction, build_simple_error_message("Failed to create ticket. Please try again."))
      return
    }
  }

  await thread.members.add(user_id)

  const ticket_id = generate_ticket_id()
  const timestamp = time.now()
  const avatar_url = interaction.user.displayAvatarURL({ size: 128 })
  const token = api.get_token()

  // - PARSE APPLICATION DATA FOR CONTENT CREATOR - \\
  let application_data: any = undefined
  if (ticket_type === "content_creator" && description) {
    try {
      application_data = JSON.parse(description)
    } catch {
      application_data = undefined
    }
  }

  const ticket_data: TicketData = {
    thread_id: thread.id,
    ticket_type: ticket_type,
    owner_id: user_id,
    ticket_id: ticket_id,
    open_time: timestamp,
    staff: [],
    issue_type: issue_type,
    description: description,
    application_data: application_data,
  }

  set_ticket(thread.id, ticket_data)
  set_user_open_ticket(ticket_type, user_id, thread.id)

  if (ticket_type === "content_creator" && description) {
    try {
      const app_data = ticket_data.application_data || JSON.parse(description)

      const cc_welcome_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text(`## <:checkmark:1417196825110253780> - Media Creator Ticket\n- Dibuka oleh: <@${user_id}>\nTerima kasih telah mendaftar sebagai Media Creator.\nMohon tunggu, staff kami akan meninjau aplikasi Anda dalam waktu dekat.\n\n`),
            ],
          }),
          component.container({
            components: [
              component.text(`## <:rbx:1447976733050667061> - Application Details:\n\n1. Link channel:\n> ${app_data.channel_links}\n\n2. Platform yang digunakan:\n> ${app_data.platform}\n\n3. Jenis konten yang dibuat:\n> ${app_data.content_type}\n\n4. Frekuensi upload / live per minggu:\n> ${app_data.upload_frequency}\n\n5. Alasan ingin bergabung sebagai Media Creator:\n> ${app_data.reason}`),
              component.divider(2),
              component.section({
                content: "Sudah selesai? Silakan tutup ticket ini.",
                accessory: component.danger_button("Close", `${config.prefix}_close`),
              }),
            ],
          }),
        ],
      })

      await api.send_components_v2(thread.id, token, cc_welcome_message)

      const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
      if (log_channel) {
        const log_message = build_ticket_log_message({
          config_name: config.name,
          owner_id: user_id,
          claimed_by: null,
          avatar_url: avatar_url,
          description_block: app_data
            ? `- **Channel:** ${app_data.channel_links}\n- **Platform:** ${app_data.platform}\n- **Content Type:** ${app_data.content_type}\n- **Frequency:** ${app_data.upload_frequency}`
            : null,
          staff: [],
          open_time: timestamp,
          join_button_id: `${config.prefix}_join_${thread.id}`,
        })

        await api.send_components_v2(log_channel.id, token, log_message).then((log_data: any) => {
          if (log_data.id) {
            const data = get_ticket(thread.id)
            if (data) {
              data.log_message_id = log_data.id
              set_ticket(thread.id, data)
            }
          }
        }).catch(() => { })
      }

      interaction.user.createDM()
        .then(dm_channel => {
          const dm_message = component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    `## <:ticket:1411878131366891580> ${config.name} Ticket Opened`,
                    ``,
                    `Your ${config.name.toLowerCase()} ticket has been created!`,
                    ``,
                    `- **Ticket ID:** ${format.code(ticket_id)}`,
                    `- **Opened:** ${time.full_date_time(timestamp)}`,
                    ``,
                    `Please check the ticket thread to continue.`,
                  ]),
                  component.action_row(
                    component.link_button("View Ticket", format.channel_url(interaction.guildId!, thread.id))
                  ),
                ],
              }),
            ],
          })
          return api.send_components_v2(dm_channel.id, token, dm_message)
        })
        .catch(() => { })

      await save_ticket_immediate(thread.id)

      const reply_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## ${config.name} Ticket Created`,
                `Your ${config.name.toLowerCase()} ticket has been created.`,
              ]),
              component.action_row(
                component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, thread.id))
              ),
            ],
          }),
        ],
      })

      api.edit_deferred_reply(interaction, reply_message)
      return
    } catch {
      // - CC PARSE FAILED, SEND GENERIC WELCOME - \\
      const fallback_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text(`## ${config.name} Ticket\nWelcome to your ${config.name.toLowerCase()} ticket, <@${user_id}> !`),
            ],
          }),
          component.container({
            components: [
              component.text(`Our staff will assist you shortly.`),
            ],
          }),
          component.container({
            components: [
              component.action_row(
                component.danger_button("Close Ticket", `${config.prefix}_close`),
                component.secondary_button("Close with Reason", `${config.prefix}_close_reason`),
                component.success_button("Claim Ticket", `${config.prefix}_claim`),
                component.secondary_button("Add Member", `${config.prefix}_add_member`)
              ),
            ],
          }),
        ],
      })
      await api.send_components_v2(thread.id, token, fallback_message)
    }
  }

  if (ticket_type !== "content_creator") {
    // - BUILD INFO LINES - \\
    const info_lines: string[] = []

    if (description) {
      info_lines.push(`- Description: \n> ${description}\n`)
    } else if (issue_type) {
      info_lines.push(`- Issue Type: ${issue_type}\n`)
    }

    const closing_line = config.show_payment_message
      ? `Please tell us which script you want to purchase and your preferred payment method.`
      : `Our staff will assist you shortly.`

    const welcome_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## ${config.name} Ticket\nWelcome to your ${config.name.toLowerCase()} ticket, <@${user_id}> !`),
          ],
        }),
        component.container({
          components: [
            ...(info_lines.length > 0 ? [component.text(info_lines.join("\n")), component.divider(2)] : []),
            component.text(closing_line),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.danger_button("Close Ticket", `${config.prefix}_close`),
              component.secondary_button("Close with Reason", `${config.prefix}_close_reason`),
              component.success_button("Claim Ticket", `${config.prefix}_claim`),
              component.secondary_button("Add Member", `${config.prefix}_add_member`)
            ),
          ],
        }),
      ],
    })

    await api.send_components_v2(thread.id, token, welcome_message)
  }

  // - PARALLEL OPERATIONS FOR SPEED - \\
  const parallel_tasks = []

  if (config.show_payment_message) {
    const payment_message: component.message_payload = {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: [
                `## <:rbx:1447976733050667061> | Payment`,
                ``,
                `Hello! While you wait for a staff member, please complete your payment to speed up the process.`,
                ``,
                `> **Important:**`,
                `> Make sure the account name matches exactly. Incorrect payments **are non-refundable**.`,
              ].join("\n"),
            },
            { type: 14, spacing: 2 },
            {
              type: 10,
              content: `### Payment Methods\nSelect a payment method below to view details:`,
            },
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: "payment_method_select",
                  placeholder: "Select Payment Method",
                  options: [
                    { label: "QRIS", value: "qris", description: "Scan QR code for instant payment", emoji: { name: "qris", id: "1251913366713139303" } },
                    { label: "Dana", value: "dana", description: "0895418425934 — Nurlaela / Rian Febriansyah", emoji: { name: "dana", id: "1251913282923790379" } },
                    { label: "GoPay", value: "gopay", description: "0895418425934 — Nurlaela / Rian Febriansyah", emoji: { name: "gopay", id: "1251913342646489181" } },
                    { label: "PayPal", value: "paypal", description: "starrykitsch@gmail.com — Rian Febriansyah", emoji: { name: "paypal", id: "1251913398816604381" } },
                  ],
                },
              ],
            }
          ],
        },
      ],
    }

    parallel_tasks.push(api.send_components_v2(thread.id, token, payment_message))
  }

  const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
  if (log_channel) {
    let description_block: string | null = null
    if (description) {
      description_block = `- **Description:**\n> ${description}`
    } else if (issue_type) {
      description_block = `- **Issue Type:** ${issue_type}`
    }

    const log_message = build_ticket_log_message({
      config_name: config.name,
      owner_id: user_id,
      claimed_by: null,
      avatar_url: avatar_url,
      description_block: description_block,
      staff: [],
      open_time: timestamp,
      join_button_id: `${config.prefix}_join_${thread.id}`,
    })

    parallel_tasks.push(
      api.send_components_v2(log_channel.id, token, log_message).then((log_data: any) => {
        if (log_data.id) {
          const data = get_ticket(thread.id)
          if (data) {
            data.log_message_id = log_data.id
            set_ticket(thread.id, data)
          }
        }
      })
    )
  }

  // - SEND DM IN PARALLEL - \\
  parallel_tasks.push(
    interaction.user.createDM()
      .then(dm_channel => {
        const dm_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `## <:ticket:1411878131366891580> ${config.name} Ticket Opened`,
                  ``,
                  `Your ${config.name.toLowerCase()} ticket has been created!`,
                  ``,
                  `- **Ticket ID:** ${format.code(ticket_id)}`,
                  `- **Opened:** ${time.full_date_time(timestamp)}`,
                  ``,
                  `Please check the ticket thread to continue.`,
                ]),
                component.action_row(
                  component.link_button("View Ticket", format.channel_url(interaction.guildId!, thread.id))
                ),
              ],
            }),
          ],
        })
        return api.send_components_v2(dm_channel.id, token, dm_message)
      })
      .catch(() => { })
  )

  // - WAIT FOR ALL PARALLEL TASKS - \\
  await Promise.allSettled(parallel_tasks)

  // - SAVE IMMEDIATELY TO PREVENT RACE CONDITION - \\
  await save_ticket_immediate(thread.id)

  const reply_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## ${config.name} Ticket Created`,
            `Your ${config.name.toLowerCase()} ticket has been created.`,
          ]),
          component.action_row(
            component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, thread.id))
          ),
        ],
      }),
    ],
  })

  // - NO AWAIT FOR FASTER RESPONSE - \\
  api.edit_deferred_reply(interaction, reply_message)
}
