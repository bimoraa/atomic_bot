import { ChatInputCommandInteraction, SlashCommandBuilder, ThreadChannel, TextChannel, GuildMember } from "discord.js"
import { Command } from "../../types/command"
import { component, time, api, format, db } from "../../utils"
import { client } from "../../index"
import { ticket_types, get_ticket } from "../../functions/unified_ticket"
import { close_ticket } from "../../functions/unified_ticket/close"
import { is_staff, is_admin_or_mod } from "../../functions/permissions"

const COLLECTION_NAME = "close_requests"

interface CloseRequest {
  thread_id:    string
  deadline:     number
  requested_by: string
  reason:       string
  created_at:   number
  message_id?:  string
}

const active_timeouts: Map<string, NodeJS.Timeout> = new Map()

function format_duration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)

  return parts.join(" ")
}

function get_ticket_parent_ids(): string[] {
  return Object.values(ticket_types).map(config => config.ticket_parent_id)
}

export async function close_ticket_by_deadline(thread: ThreadChannel, reason: string = "Deadline reached"): Promise<void> {
  await close_ticket({
    thread,
    client,
    closed_by: "System",
    reason,
  })

  if (db.is_connected()) {
    await db.delete_one(COLLECTION_NAME, { thread_id: thread.id })
  }
  active_timeouts.delete(thread.id)
}

function schedule_close(thread_id: string, deadline: number, reason: string): void {
  const existing = active_timeouts.get(thread_id)
  if (existing) clearTimeout(existing)

  const delay = deadline - Date.now()
  if (delay <= 0) {
    const thread = client.channels.cache.get(thread_id) as ThreadChannel
    if (thread) close_ticket_by_deadline(thread, reason)
    return
  }

  const timeout = setTimeout(async () => {
    const thread = client.channels.cache.get(thread_id) as ThreadChannel
    if (thread && !thread.archived) {
      await close_ticket_by_deadline(thread, reason)
    }
    active_timeouts.delete(thread_id)
  }, delay)

  active_timeouts.set(thread_id, timeout)
}

export async function load_close_requests(): Promise<void> {
  if (!db.is_connected()) return

  const requests = await db.find_many<CloseRequest>(COLLECTION_NAME, {})
  const now = Date.now()

  for (const req of requests) {
    if (req.deadline <= now) {
      const thread = client.channels.cache.get(req.thread_id) as ThreadChannel
      if (thread && !thread.archived) {
        await close_ticket_by_deadline(thread, req.reason || "Deadline reached")
      }
      await db.delete_one(COLLECTION_NAME, { thread_id: req.thread_id })
    } else {
      schedule_close(req.thread_id, req.deadline, req.reason || "Deadline reached")
    }
  }

  console.log(`[close_request] Loaded ${requests.length} pending close requests`)
}

export async function cancel_close_request(thread_id: string): Promise<boolean> {
  const existing = active_timeouts.get(thread_id)
  if (existing) {
    clearTimeout(existing)
    active_timeouts.delete(thread_id)
  }

  if (db.is_connected()) {
    return db.delete_one(COLLECTION_NAME, { thread_id })
  }
  return false
}

export async function get_close_request(thread_id: string): Promise<CloseRequest | null> {
  if (!db.is_connected()) return null
  return db.find_one<CloseRequest>(COLLECTION_NAME, { thread_id })
}

function build_close_request_message(
  staff_id: string,
  staff_avatar: string,
  reason: string,
  deadline_timestamp: number | null
): component.message_payload {
  const deadline_text = deadline_timestamp
    ? `- **Deadline:** <t:${deadline_timestamp}:R> (<t:${deadline_timestamp}:F>)`
    : `- **Deadline:** No deadline`

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          {
            type: 9,
            components: [
              {
                type: 10,
                content: [
                  `## Close Request`,
                  `<@${staff_id}> has requested to close this ticket`,
                  `- **Reason:** ${reason}`,
                  deadline_text,
                ].join("\n"),
              },
            ],
            accessory: {
              type: 11,
              media: {
                url: staff_avatar,
              },
            },
          },
          {
            type: 14,
            spacing: 2,
          },
          {
            type: 10,
            content: "Please accept or deny using the buttons below.",
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "Accept & Close",
                custom_id: "close_request_accept",
              },
              {
                type: 2,
                style: 2,
                label: "Deny & Keep Open",
                custom_id: "close_request_deny",
              },
            ],
          },
        ],
      },
    ],
  } as component.message_payload
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("close-request")
    .setDescription("Request to close purchase ticket with deadline")
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for closing")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("Deadline (e.g. 1h, 30m, 2d, 1d12h) - optional")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const thread = interaction.channel as ThreadChannel
    const member = interaction.member as GuildMember

    if (!is_staff(member) && !is_admin_or_mod(member)) {
      await interaction.reply({
        content: "Only staff can use this command.",
        ephemeral: true,
      })
      return
    }

    if (!thread.isThread() || !get_ticket_parent_ids().includes(thread.parentId || "")) {
      await interaction.reply({
        content: "This command can only be used in a ticket thread.",
        ephemeral: true,
      })
      return
    }

    const time_str = interaction.options.getString("time")
    const reason   = interaction.options.getString("reason", true)

    let deadline: number | null = null
    let deadline_timestamp: number | null = null

    if (time_str) {
      const duration_ms = parse_duration(time_str)
      if (!duration_ms || duration_ms < 60000) {
        await interaction.reply({
          content: "Invalid time format. Use: `1h`, `30m`, `2d`, `1d12h` (minimum 1 minute)",
          ephemeral: true,
        })
        return
      }
      deadline = Date.now() + duration_ms
      deadline_timestamp = Math.floor(deadline / 1000)
    }

    const staff_avatar = interaction.user.displayAvatarURL({ size: 128 })

    const message = build_close_request_message(
      interaction.user.id,
      staff_avatar,
      reason,
      deadline_timestamp
    )

    await interaction.reply({ content: "Close request sent.", ephemeral: true })
    const sent = await api.send_components_v2(thread.id, api.get_token(), message)

    if (db.is_connected()) {
      const request: CloseRequest = {
        thread_id: thread.id,
        deadline: deadline || 0,
        requested_by: interaction.user.id,
        reason,
        created_at: Date.now(),
        message_id: sent.id,
      }
      await db.update_one(COLLECTION_NAME, { thread_id: thread.id }, request, true)
    }

    if (deadline) {
      schedule_close(thread.id, deadline, reason)
    }
  },
}

function parse_duration(str: string): number | null {
  const regex = /(\d+)\s*(d|h|m|s)/gi
  let total = 0
  let match

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1])
    const unit  = match[2].toLowerCase()

    switch (unit) {
      case "d": total += value * 86400000; break
      case "h": total += value * 3600000; break
      case "m": total += value * 60000; break
      case "s": total += value * 1000; break
    }
  }

  return total > 0 ? total : null
}

export default command
