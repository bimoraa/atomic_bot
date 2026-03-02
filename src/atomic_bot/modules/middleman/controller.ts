import {
  UserSelectMenuInteraction,
  ModalSubmitInteraction,
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
} from "@shared/database/unified_ticket"
import {
  create_middleman_ticket,
  count_user_active_tickets,
} from "@shared/database/managers/middleman_manager"
import { component, time, api, format } from "@shared/utils"
import { log_error } from "@shared/utils/error_logger"

interface TransactionRange {
  label : string
  range : string
  fee   : string
}

const __transaction_ranges: Record<string, TransactionRange> = {
  "dVzaCndYpO": { label: "Rp 10.000 – Rp 50.000",   range: "Rp 10.000 – Rp 50.000",   fee: "Rp 1.500" },
  "laf8By4Gtm": { label: "Rp 51.000 – Rp 100.000",  range: "Rp 51.000 – Rp 100.000",  fee: "Rp 5.000" },
  "1FS1PRT0Ys": { label: "Rp 101.000 – Rp 200.000", range: "Rp 101.000 – Rp 200.000", fee: "Rp 8.000" },
  "WnGoXX4HnQ": { label: "Rp 201.000 – Rp 300.000", range: "Rp 201.000 – Rp 300.000", fee: "Rp 12.000" },
  "PIMLKDohan": { label: "≥ Rp 300.000",            range: "≥ Rp 300.000",            fee: "5% dari total transaksi" },
}

const __fee_labels: Record<string, string> = {
  penjual: "Penjual",
  pembeli: "Pembeli",
  dibagi : "Dibagi Dua",
}

interface TransactionDetails {
  penjual_id : string
  pembeli_id : string
  jenis      : string
  harga      : string
  fee_oleh   : string
}

interface OpenMiddlemanTicketOptions {
  interaction  : UserSelectMenuInteraction | ModalSubmitInteraction
  range_id     : string
  partner_id   : string
  transaction  : TransactionDetails
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
  const { interaction, range_id, partner_id, transaction } = options

  const ticket_type = "middleman"
  const config      = get_ticket_config(ticket_type)

  if (!config) {
    return { success: false, error: "Middleman ticket configuration not found." }
  }

  const range_data = __transaction_ranges[range_id]
  if (!range_data) {
    return { success: false, error: "Invalid transaction range." }
  }

  const user_id            = interaction.user.id
  const existing_thread_id = get_user_open_ticket(ticket_type, user_id)

  const { penjual_id, pembeli_id } = transaction

  // - CHECK MAX TICKET LIMIT PER USER (5 TICKETS) - \\
  const unique_parties = [...new Set([user_id, penjual_id, pembeli_id])]
  const ticket_counts  = await Promise.all(unique_parties.map(id => count_user_active_tickets(id)))

  for (let i = 0; i < unique_parties.length; i++) {
    if (ticket_counts[i] >= 5) {
      return {
        success: false,
        error  : `<@${unique_parties[i]}> sudah memiliki 5 tiket aktif. Harap tutup beberapa tiket terlebih dahulu.`,
      }
    }
  }

  const ticket_channel = await interaction.client.channels.fetch(config.ticket_parent_id).catch(() => null) as TextChannel | null
  if (!ticket_channel) {
    return { success: false, error: "Ticket channel not found." }
  }

  try {
    const thread = await ticket_channel.threads.create({
      name               : `${config.thread_prefix}-${interaction.user.username}`,
      type               : ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    })

    // - ADD ALL PARTIES TO THREAD - \\
    const thread_members = [...new Set([user_id, penjual_id, pembeli_id])]
    for (const member_id of thread_members) {
      await thread.members.add(member_id).catch(() => {})
    }

    const staff_ids = ["1118453649727823974", "713377329623072822"]
    for (const staff_id of staff_ids) {
      try {
        await thread.members.add(staff_id)
      } catch (err) {
        console.error(`[ - MIDDLEMAN TICKET - ] Failed to add staff ${staff_id}:`, err)
      }
    }

    const ticket_id  = generate_ticket_id()
    const timestamp  = time.now()
    const token      = api.get_token()

    const ticket_data: TicketData = {
      thread_id  : thread.id,
      ticket_type: ticket_type,
      owner_id   : user_id,
      ticket_id  : ticket_id,
      open_time  : timestamp,
      staff      : [],
      issue_type : range_id,
      description: `Penjual: <@${penjual_id}> | Pembeli: <@${pembeli_id}>`,
    }

    set_ticket(thread.id, ticket_data)
    set_user_open_ticket(ticket_type, user_id, thread.id)

    const __midman_id  = "713377329623072822"
    const fee_label    = __fee_labels[transaction.fee_oleh] ?? transaction.fee_oleh

    const welcome_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## Middleman Ticket \nHalo <@${penjual_id}> dan <@${pembeli_id}>`),
            component.divider(2),
            component.text([
              `### Detail transaksi:`,
              `- Rentang Transaksi: ${range_data.range}`,
              `- Fee Rekber: ${range_data.fee}`,
            ]),
            component.divider(2),
            component.text([
              ``,
              `- Penjual : <@${penjual_id}>`,
              `- Pembeli : <@${pembeli_id}>`,
              `- Jenis Barang yang Dijual : ${transaction.jenis}`,
              `- Harga Barang yang Dijual : Rp. ${transaction.harga}`,
              `- Fee oleh : ${fee_label}`,
            ]),
            component.divider(2),
            component.text(`<@${__midman_id}>  akan membantu memproses transaksi ini.`),
          ],
        }),
        component.container({
          components: [
            component.text(`## BACA INI TERLEBIH DAHULU !\nJangan TF dulu sebelum <@${__midman_id}>  respon didalam tiket kamu`),
          ],
        }),
        component.container({
          components: [
            component.text("## Metode Pembayaran\nSilakan pilih metode pembayaran yang tersedia melalui dropdown di bawah.\n"),
            component.select_menu("payment_method_select", "Pilih metode pembayaran", [
              { label: "QRIS",           value: "qris",      description: "All banks & e-wallets" },
              { label: "Dana/OVO/GoPay", value: "dana",      description: "085763794032 — Daniel Yedija Laowo" },
              { label: "Bank Jago",      value: "bank_jago", description: "107329884762 — Daniel Yedija Laowo" },
              { label: "Seabank",        value: "seabank",   description: "901996695987 — Daniel Yedija Laowo" },
              { label: "BRI",            value: "bri",       description: "817201005576534 — Daniel Yedija Laowo" },
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.danger_button("Close",                `middleman_close:${thread.id}`),
              component.secondary_button("Close with Reason", `middleman_close_reason:${thread.id}`),
              component.primary_button("Add Member",          `middleman_add_member:${thread.id}`),
              component.success_button("Complete",            `middleman_complete:${thread.id}`)
            ),
          ],
        }),
      ],
    })

    const welcome_response = await api.send_components_v2(thread.id, token, welcome_message)
    if (welcome_response.id) {
      api.pin_message(thread.id, welcome_response.id, token).catch(() => {})
    }

    let log_message_id: string | undefined

    const log_channel = await interaction.client.channels.fetch(config.log_channel_id).catch(() => null) as TextChannel | null
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
                `- Dibuka oleh: <@${user_id}>`,
                `- Penjual: <@${penjual_id}>`,
                `- Pembeli: <@${pembeli_id}>`,
                `- Range: ${range_data.range}`,
                `- Fee: ${range_data.fee}`,
              ]),
            ],
          }),
        ],
      })

      const log_response = await api.send_components_v2(log_channel.id, token, log_message)
      if (log_response.id) {
        log_message_id = log_response.id
      }
    }

    // - SAVE TO DATABASE FOR PERSISTENCE - \\
    const penjual_user = await interaction.client.users.fetch(penjual_id).catch(() => null)

    await create_middleman_ticket({
      thread_id        : thread.id,
      ticket_id        : ticket_id,
      requester_id     : user_id,
      partner_id       : penjual_id,
      partner_tag      : penjual_user?.tag ?? penjual_id,
      transaction_range: range_data.range,
      fee              : range_data.fee,
      range_id         : range_id,
      guild_id         : interaction.guildId || "",
      status           : "open",
      created_at       : timestamp,
      updated_at       : timestamp,
      log_message_id   : log_message_id,
    })

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
      penjual_id: penjual_id,
      pembeli_id: pembeli_id,
      range_id  : range_id,
    })
    return {
      success: false,
      error  : "Failed to create ticket. Please try again later.",
    }
  }
}
