import {
  UserSelectMenuInteraction,
  TextChannel,
  ChannelType,
  ThreadAutoArchiveDuration,
} from "discord.js"
import {
  get_ticket_config,
  get_user_open_ticket,
  set_user_open_ticket,
  remove_user_open_ticket,
  generate_ticket_id,
  set_ticket,
  save_ticket_immediate,
  TicketData,
} from "../../../shared/database/unified_ticket"
import {
  create_middleman_ticket,
  get_user_active_ticket,
} from "../../../shared/database/managers/middleman_manager"
import { component, time, api, format } from "../../../shared/utils"
import { log_error } from "../../../shared/utils/error_logger"

interface TransactionRange {
  label : string
  range : string
  fee   : string
}

const TRANSACTION_RANGES: Record<string, TransactionRange> = {
  "dVzaCndYpO": { label: "Rp 10.000 – Rp 50.000",   range: "Rp 10.000 – Rp 50.000",   fee: "Rp 1.500" },
  "laf8By4Gtm": { label: "Rp 50.000 – Rp 100.000",  range: "Rp 50.000 – Rp 100.000",  fee: "Rp 5.000" },
  "1FS1PRT0Ys": { label: "Rp 100.000 – Rp 200.000", range: "Rp 100.000 – Rp 200.000", fee: "Rp 8.000" },
  "WnGoXX4HnQ": { label: "Rp 200.000 – Rp 300.000", range: "Rp 200.000 – Rp 300.000", fee: "Rp 12.000" },
  "PIMLKDohan": { label: "≥ Rp 300.000",            range: "≥ Rp 300.000",            fee: "5% dari total transaksi" },
}

interface OpenMiddlemanTicketOptions {
  interaction : UserSelectMenuInteraction
  range_id    : string
  partner_id  : string
}

interface OpenMiddlemanTicketResult {
  success : boolean
  message?: string
  error?  : string
}

/**
 * @description Opens a middleman service ticket with transaction details
 * @param {OpenMiddlemanTicketOptions} options - Options for opening the ticket
 * @returns {Promise<OpenMiddlemanTicketResult>} - Result of the operation
 */
export async function open_middleman_ticket(options: OpenMiddlemanTicketOptions): Promise<OpenMiddlemanTicketResult> {
  const { interaction, range_id, partner_id } = options

  const ticket_type = "middleman"
  const config      = get_ticket_config(ticket_type)

  if (!config) {
    return { success: false, error: "Middleman ticket configuration not found." }
  }

  const range_data = TRANSACTION_RANGES[range_id]
  if (!range_data) {
    return { success: false, error: "Invalid transaction range." }
  }

  const user_id            = interaction.user.id
  const existing_thread_id = get_user_open_ticket(ticket_type, user_id)

  // - CHECK DATABASE FOR ACTIVE TICKET - \\
  const db_active_ticket = await get_user_active_ticket(user_id)
  if (db_active_ticket) {
    try {
      const thread = await interaction.client.channels.fetch(db_active_ticket.thread_id)
      if (thread && thread.isThread() && !thread.locked && !thread.archived) {
        return {
          success: false,
          error  : `You already have an open ${config.name.toLowerCase()} ticket. Please close it first.`,
        }
      }
    } catch {
      // - THREAD NOT FOUND, CONTINUE - \\
    }
  }

  if (existing_thread_id) {
    try {
      const thread = await interaction.client.channels.fetch(existing_thread_id)
      if (thread && thread.isThread() && !thread.locked && !thread.archived) {
        return {
          success: false,
          error  : `You already have an open ${config.name.toLowerCase()} ticket. Please close it first.`,
        }
      }
      remove_user_open_ticket(ticket_type, user_id)
    } catch {
      remove_user_open_ticket(ticket_type, user_id)
    }
  }

  const ticket_channel = interaction.client.channels.cache.get(config.ticket_parent_id) as TextChannel
  if (!ticket_channel) {
    return { success: false, error: "Ticket channel not found." }
  }

  try {
    const thread = await ticket_channel.threads.create({
      name               : `${config.thread_prefix}-${interaction.user.username}`,
      type               : ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    })

    await thread.members.add(user_id)
    await thread.members.add(partner_id)

    const staff_ids = ["1118453649727823974", "713377329623072822"]
    for (const staff_id of staff_ids) {
      try {
        await thread.members.add(staff_id)
      } catch (err) {
        console.error(`[ - MIDDLEMAN TICKET - ] Failed to add staff ${staff_id}:`, err)
      }
    }

    const ticket_id   = generate_ticket_id()
    const timestamp   = time.now()
    const avatar_url  = interaction.user.displayAvatarURL({ size: 128 })
    const partner     = await interaction.client.users.fetch(partner_id)
    const token       = api.get_token()

    const ticket_data: TicketData = {
      thread_id  : thread.id,
      ticket_type: ticket_type,
      owner_id   : user_id,
      ticket_id  : ticket_id,
      open_time  : timestamp,
      staff      : [],
      issue_type : range_id,
      description: `Partner: <@${partner_id}>`,
    }

    set_ticket(thread.id, ticket_data)
    set_user_open_ticket(ticket_type, user_id, thread.id)

    // - SAVE TO DATABASE FOR PERSISTENCE - \\
    await create_middleman_ticket({
      thread_id        : thread.id,
      ticket_id        : ticket_id,
      requester_id     : user_id,
      partner_id       : partner_id,
      partner_tag      : partner.tag,
      transaction_range: range_data.range,
      fee              : range_data.fee,
      range_id         : range_id,
      guild_id         : interaction.guildId || "",
      status           : "open",
      created_at       : timestamp,
      updated_at       : timestamp,
    })

    const welcome_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## Ticket Opened\nHalo <@${user_id}> dan <@${partner_id}>`),
            component.divider(2),
            component.text([
              `**Detail transaksi:**`,
              `- Rentang transaksi: ${range_data.range}`,
              `- Fee Rekber: ${range_data.fee}`,
            ]),
            component.divider(2),
            component.text(`<@${staff_ids[0]}> dan <@${staff_ids[1]}> akan membantu memproses transaksi ini.`),
          ],
        }),
        component.container({
          components: [
            component.text("## Metode Pembayaran\nSilakan pilih metode pembayaran yang tersedia melalui dropdown di bawah."),
            component.select_menu("payment_method_select", "Pilih metode pembayaran", [
              { label: "QRIS", value: "qris", description: "All banks & e-wallets" },
              { label: "Dana/OVO/GoPay", value: "dana", description: "085763794032 — Daniel Yedija Laowo" },
              { label: "Bank Jago", value: "bank_jago", description: "107329884762 — Daniel Yedija Laowo" },
              { label: "Seabank", value: "seabank", description: "901996695987 — Daniel Yedija Laowo" },
              { label: "BRI", value: "bri", description: "817201005576534 — Daniel Yedija Laowo" },
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.danger_button("Close", `middleman_close:${thread.id}`),
              component.secondary_button("Close with Reason", `middleman_close_reason:${thread.id}`),
              component.secondary_button("Add Member", `middleman_add_member:${thread.id}`),
              component.success_button("Complete", `middleman_complete:${thread.id}`)
            ),
          ],
        }),
      ],
    })

    await api.send_components_v2(thread.id, token, welcome_message)

    const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
    if (log_channel) {
      const log_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "## New Middleman Ticket !",
                accessory : component.link_button("View Ticket", format.channel_url(interaction.guildId!, thread.id)),
              }),
              component.divider(2),
              component.text([
                `- Ticket ID: **${ticket_id}**`,
                `- Requester: <@${user_id}>`,
                `- Partner: <@${partner_id}>`,
                `- Range: ${range_data.range}`,
                `- Fee: ${range_data.fee}`,
              ]),
            ],
          }),
        ],
      })

      await api.send_components_v2(log_channel.id, token, log_message)
    }

    // - SAVE TICKET IMMEDIATELY TO PREVENT RACE CONDITION - \\
    await save_ticket_immediate(thread.id)

    return {
      success: true,
      message: `Middleman ticket created successfully! <#${thread.id}>`,
    }
  } catch (error) {
    console.error("[ - MIDDLEMAN TICKET - ] Error creating ticket:", error)
    await log_error(interaction.client, error as Error, "Middleman Controller - Create Ticket", {
      user_id   : user_id,
      partner_id: partner_id,
      range_id  : range_id,
    })
    return {
      success: false,
      error  : "Failed to create ticket. Please try again later.",
    }
  }
}
