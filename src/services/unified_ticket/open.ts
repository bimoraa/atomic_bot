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
  TicketData,
} from "./state"
import { component, time, api, format } from "../../utils"

interface OpenTicketOptions {
  interaction:  ButtonInteraction
  ticket_type:  string
  issue_type?:  string
  description?: string
}

export async function open_ticket(options: OpenTicketOptions): Promise<void> {
  const { interaction, ticket_type, issue_type, description } = options
  const config = get_ticket_config(ticket_type)

  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const user_id            = interaction.user.id
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

  const thread = await ticket_channel.threads.create({
    name:                `${config.thread_prefix}-${interaction.user.username}`,
    type:                ChannelType.PrivateThread,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  })

  await thread.members.add(user_id)

  const ticket_id = generate_ticket_id()
  const timestamp = time.now()
  const avatar_url = interaction.user.displayAvatarURL({ size: 128 })
  const token = api.get_token()

  const ticket_data: TicketData = {
    thread_id:   thread.id,
    ticket_type: ticket_type,
    owner_id:    user_id,
    ticket_id:   ticket_id,
    open_time:   timestamp,
    staff:       [],
    issue_type:  issue_type,
    description: description,
  }

  set_ticket(thread.id, ticket_data)
  set_user_open_ticket(ticket_type, user_id, thread.id)

  let welcome_content = [
    `## ${config.name} Ticket`,
    `Welcome to your ${config.name.toLowerCase()} ticket, <@${user_id}>!`,
    ``,
  ]

  if (issue_type) {
    welcome_content.push(`- **Issue Type:** ${issue_type}`)
  }
  if (description) {
    welcome_content.push(`- **Description:** ${description}`)
    welcome_content.push(``)
  }

  if (config.show_payment_message) {
    welcome_content.push(`Please tell us which script you want to purchase and your preferred payment method.`)
  } else {
    welcome_content.push(`Our staff will assist you shortly.`)
  }

  const welcome_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: welcome_content,
            thumbnail: avatar_url,
          }),
          component.action_row(
            component.danger_button("Close Ticket", `${config.prefix}_close`),
            component.secondary_button("Close with Reason", `${config.prefix}_close_reason`),
            component.primary_button("Claim Ticket", `${config.prefix}_claim`),
            component.secondary_button("Add Member", `${config.prefix}_add_member`)
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread.id, token, welcome_message)

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

    await api.send_components_v2(thread.id, token, payment_message)
  }

  const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
  if (log_channel) {
    let log_content = [
      `## Join Ticket`,
      `A ${config.name} Ticket is Opened!`,
      ``,
      `- **Ticket ID:** ${format.code(ticket_id)}`,
      `- **Type:** ${config.name}`,
      `- **Opened by:** <@${user_id}>`,
    ]

    if (issue_type) {
      log_content.push(`- **Issue:** ${issue_type}`)
    }

    log_content.push(`- **Claimed by:** Not claimed`)

    let description_section: any[] = []
    if (description) {
      description_section = [
        component.divider(),
        component.text([
          `- **Description:** ${description}`,
        ]),
      ]
    }

    const log_message = component.build_message({
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
              `- **Staff in Ticket:** 0`,
              `- **Staff Members:** None`,
            ]),
            component.divider(),
            component.action_row(
              component.success_button("Join Ticket", `${config.prefix}_join_${thread.id}`)
            ),
          ],
        }),
      ],
    })

    const log_data = await api.send_components_v2(log_channel.id, token, log_message) as { id?: string }
    if (log_data.id) {
      const data = get_ticket(thread.id)
      if (data) {
        data.log_message_id = log_data.id
        set_ticket(thread.id, data)
      }
    }
  }

  await save_ticket(thread.id)

  try {
    const dm_channel = await interaction.user.createDM()
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

    await api.send_components_v2(dm_channel.id, token, dm_message)
  } catch {}

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

  await api.edit_deferred_reply(interaction, reply_message)
}
