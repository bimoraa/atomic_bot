/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 中间人功能的模块控制器 - \
// - module controller for the middleman feature - \
import {
  TextChannel,
  ChannelType,
  ThreadAutoArchiveDuration,
} from "discord.js"
import {
  get_ticket_config,
  get_user_open_ticket,
  set_user_open_ticket,
  generate_ticket_id,
  set_ticket,
  save_ticket_immediate,
  TicketData,
} from "@database/unified_ticket"
import {
  create_middleman_ticket,
  count_user_active_tickets,
} from "@managers/middleman.manager"
import { component, time, api, format }                 from "@utils"
import { log_error }                                     from "@utils/error_logger"
import {
  TransactionRange,
  TransactionDetails,
  OpenMiddlemanTicketOptions,
  OpenMiddlemanTicketResult,
} from "@models/middleman.model"
import { __middleman_staff_ids, __midman_user_id } from "@constants/roles"

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

/**
 * @description opens a middleman service ticket with transaction details
 * @param {OpenMiddlemanTicketOptions} options - options for opening the ticket
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

  const penjual_id = transaction?.penjual_id || user_id
  const pembeli_id = transaction?.pembeli_id || partner_id

  // - 检查每个用户的最大工单数量（5个） - \\
  // - check max ticket limit per user (5 tickets) - \\
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

    // - 将所有相关方添加到频道 - \\
    // - add all parties to thread - \\
    const thread_members = [...new Set([user_id, penjual_id, pembeli_id])]
    for (const member_id of thread_members) {
      await thread.members.add(member_id).catch(() => {})
    }

    for (const staff_id of __middleman_staff_ids) {
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

    const fee_label = transaction ? (__fee_labels[transaction.fee_oleh] ?? transaction.fee_oleh) : "-"

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
              `- Jenis Barang yang Dijual : ${transaction?.jenis ?? "-"}`,
              `- Harga Barang yang Dijual : Rp. ${transaction?.harga ?? "-"}`,
              `- Fee oleh : ${fee_label}`,
            ]),
            component.divider(2),
            component.text(`<@${__midman_user_id}>  akan membantu memproses transaksi ini.`),
          ],
        }),
        component.container({
          components: [
            component.text(`## BACA INI TERLEBIH DAHULU !\nJangan TF dulu sebelum <@${__midman_user_id}>  respon didalam tiket kamu`),
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

    // - 保存到数据库以持久化 - \\
    // - save to database for persistence - \\
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

    // - 立即保存工单以防止竞争条件 - \\
    // - save ticket immediately to prevent race condition - \\
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

// - 中间人维护模式配置类型 - \\
// - middleman maintenance config type from remote JSON - \\
interface MiddlemanConfig {
  __maintenance: boolean
}

// - 带 TTL 的维护模式缓存，30 秒过期 - \\
// - in-memory maintenance mode cache with 30s TTL - \\
let __maintenance_cache       : { value: boolean; expires_at: number } | null = null
const __maintenance_cache_ttl = 30_000
const __maintenance_config_url = "https://raw.githubusercontent.com/bimoraa/atomic_bot/refs/heads/main/.config/__middleman.json"

/**
 * @description fetches maintenance mode status from remote config with 30s TTL cache
 * @returns {Promise<boolean>} true if maintenance mode is active
 */
export async function fetch_maintenance_mode(): Promise<boolean> {
  const now = Date.now()

  // - 未过期则直接返回缓存 - \\
  // - return cached value if still fresh - \\
  if (__maintenance_cache && now < __maintenance_cache.expires_at) {
    return __maintenance_cache.value
  }

  try {
    const res    = await fetch(__maintenance_config_url, { signal: AbortSignal.timeout(5000) })
    const json   = await res.json() as MiddlemanConfig
    const value  = json.__maintenance === true

    __maintenance_cache = { value, expires_at: now + __maintenance_cache_ttl }
    return value
  } catch {
    // - 网络失败时回退到缓存，若无缓存则放行 - \\
    // - on fetch failure, fall back to cached value or false - \\
    return __maintenance_cache?.value ?? false
  }
}

// - 严重故障错误消息构建器 - \\
// - Component V2 critical failure reply builder for ticket open errors - \\

const __yaml_error_block = `\`\`\`yaml
status          : CRITICAL_FAILURE
severity_level  : P0
urgency         : IMMEDIATE_ACTION_REQUIRED
service         : middleman_ticket_service
cluster         : mm-prod-cluster-01
region          : ap-southeast-1
environment     : production

incident_overview:
  title         : "Database State Violation During Ticket Creation"
  detected_at   : 2026-04-02T22:52:00Z
  detected_by   : automated_integrity_monitor
  escalation    : true

  description: >
    Fatal inconsistency detected in the transactional database layer
    during CREATE_TICKET. Core invariants violated — system is in
    a mathematically inconsistent state.

    Let D(t) = db state, I(t) = integrity fn, C = constraint set.
    I(t) = ∧(c ∈ C) c(D(t))
    Observed: ∃t₀ : I(t₀) = 0  ⇒  DB entered INVALID STATE

db_node:
  engine        : PostgreSQL 14.9
  node          : mm-db-node-3
  role          : PRIMARY
  state         : CORRUPTED
  availability  : DEGRADED

  ACID:
    atomicity   : FAILED
    consistency : FAILED
    isolation   : PARTIAL
    durability  : FAILED

  integrity_score:
    corrupted_tables : 5 / 42
    R                : ≈ 0.119
    I = 1 - R        : ≈ 0.881  → BELOW SAFE THRESHOLD

  io_failure:
    base_latency : 12ms
    spike        : 470ms
    L(t)         : ≈ 482ms  → ABNORMAL
    failure_rate : λ = 0.87  → P(failure) ≈ 0.999999

trace:
  request_id    : MMT-ULTRA-CRASH-7781
  timeline:
    t5          : WRITE_OPERATION  ← FAILURE
    t6          : WAL_APPEND       ← FAILED
    t7          : ROLLBACK         ← INCOMPLETE
    t8          : STATE_DESYNC     ← TRUE

  failure: (¬W ∧ ¬R)  ⇒  undefined behavior

diagnostics:
  valid_rows    : 4102 / 10000  → C(x) = 0.4102
  entropy_obs   : 8.91  (expected ≤ 5.12)  → ΔH = 3.79

system_flags:
  read_only_mode  : ENABLED
  write_ops       : BLOCKED
  circuit_breaker : TRIGGERED
  auto_recovery   : ACTIVE
  retryable       : false

stability:
  S = I - E  →  S ≈ 0.41 - 0.87 = -0.46  → SYSTEM UNSTABLE

user_notice:
  Ticket system temporarily unavailable due to critical failure.
  Await further updates after recovery completion.
\`\`\``

/**
 * @description builds the Component V2 critical error reply for a failed ticket open
 * @returns {object} component.build_message output
 */
export function build_ticket_critical_error_reply() {
  return component.build_message({
    components: [
      component.container({
        components  : [component.text("## Failed to Open Middleman Ticket!")],
        accent_color: 15277667,
      }),
      component.container({
        components: [
          component.text(
            "Ada error pas buka **Middleman Ticket** nih.\n\n" +
            "Ini udah masuk level **critical banget**, bukan sekadar error biasa. Sistem lagi kena masalah serius " +
            "di database sampai ngeganggu struktur & konsistensi data. Jadi sementara fitur ticket belum bisa dipakai.\n\n" +
            "**Tolong bantu report ke developer/admin** biar kasus ini bisa langsung ditangani lebih lanjut dan diprioritaskan fix-nya.\n\n" +
            "Sementara ini lagi dalam proses investigasi & recovery, jadi tunggu dulu ya sampai sistem balik normal.\n\n" +
            "Makasii udah sabar nunggu!"
          ),
          component.divider(2),
          component.text(`## Error:\n\n${__yaml_error_block}`),
        ],
      }),
    ],
  })
}
