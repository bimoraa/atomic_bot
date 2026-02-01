import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  GuildMember,
  Guild,
  ThreadChannel,
  ChannelType,
  MessageFlags,
}                            from "discord.js"
import { Command }           from "../../../shared/types/command"
import { component, db }     from "../../../shared/utils"
import { is_admin_or_mod }   from "../../../shared/database/settings/permissions"
import { close_ticket }      from "../../../shared/database/unified_ticket/close"
import { client }            from "../../../index"
import {
  ticket_data,
  ticket_types,
  load_all_tickets,
}                            from "../../../shared/database/unified_ticket"
import { log_error }         from "../../../shared/utils/error_logger"

const TICKETS_COLLECTION = "unified_tickets"

interface TicketData {
  thread_id : string
  open_time?: number
}

/**
 * @description Get all tickets opened before a specific date
 * @param before_date - Unix timestamp in milliseconds
 * @returns Array of ticket data
 */
async function get_tickets_before_date(before_date: number): Promise<TicketData[]> {
  const tickets: TicketData[] = []

  for (const [, data] of ticket_data) {
    if (data.open_time && data.open_time < before_date) {
      tickets.push({
        thread_id : data.thread_id,
        open_time : data.open_time,
      })
    }
  }

  return tickets
}

/**
 * @description Get all ticket parent IDs from config
 * @returns Array of parent channel IDs
 */
function get_ticket_parent_ids(): string[] {
  return Object.values(ticket_types).map(config => config.ticket_parent_id)
}

/**
 * @description Get active ticket threads opened before a specific date
 * @param before_date - Unix timestamp in milliseconds
 * @param guild - Guild instance
 * @returns Array of thread IDs
 */
async function get_active_threads_before_date(before_date: number, guild: Guild): Promise<TicketData[]> {

  const parent_ids = new Set(get_ticket_parent_ids())

  try {
    const active_threads = await guild.channels.fetchActiveThreads()
    const threads = active_threads.threads.filter(thread => {
      if (!thread.parentId || !parent_ids.has(thread.parentId)) return false
      if (!thread.createdTimestamp) return false
      return thread.createdTimestamp < before_date
    })

    return threads.map(thread => ({
      thread_id : thread.id,
      open_time : thread.createdTimestamp || undefined,
    }))
  } catch (error) {
    log_error(client, error as Error, "clear_ticket_fetch_active_threads")
    return []
  }
}

/**
 * @description Build simple text message for component v2
 * @param text - Message text
 * @returns Message payload
 */
function build_simple_message(text: string): component.message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [component.text(text)],
      }),
    ],
  })
}

/**
 * @description Build progress message for bulk close
 * @param closed - Number of closed tickets
 * @param failed - Number of failed tickets
 * @param total - Total tickets to process
 * @param before_date - Date string
 * @returns Message payload
 */
function build_progress_message(closed: number, failed: number, total: number, before_date: string): component.message_payload {
  const processed = closed + failed
  const remaining = Math.max(total - processed, 0)

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Clear Ticket Progress`,
            `Closing tickets opened before **${before_date}**`,
            ``,
            `- **Total:** ${total}`,
            `- **Processed:** ${processed}`,
            `- **Closed:** ${closed}`,
            `- **Failed:** ${failed}`,
            `- **Remaining:** ${remaining}`,
          ]),
        ],
      }),
    ],
  })
}

/**
 * @description Build confirmation message for clear ticket operation
 * @param count - Number of tickets to be closed
 * @param before_date - Date string
 * @returns Message payload
 */
function build_confirmation_message(count: number, before_date: string): component.message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Clear Ticket Confirmation`,
            `Found **${count}** tickets opened before **${before_date}**`,
            ``,
            `Are you sure you want to close all these tickets?`,
          ]),
          component.divider(),
          component.action_row(
            component.danger_button("Confirm Close All", "clear_ticket_confirm"),
            component.secondary_button("Cancel", "clear_ticket_cancel")
          ),
        ],
      }),
    ],
  })
}

/**
 * @description Build result message for clear ticket operation
 * @param closed - Number of successfully closed tickets
 * @param failed - Number of failed tickets
 * @param before_date - Date string
 * @returns Message payload
 */
function build_result_message(closed: number, failed: number, before_date: string): component.message_payload {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Clear Ticket Complete`,
            `Closed tickets opened before **${before_date}**`,
            ``,
            `- **Closed:** ${closed}`,
            `- **Failed:** ${failed}`,
          ]),
        ],
      }),
    ],
  })
}

/**
 * @description Parse date string to Unix timestamp
 * @param date_str - Date string in format YYYY-MM-DD
 * @returns Unix timestamp in milliseconds or null if invalid
 */
function parse_date(date_str: string): number | null {
  const date = new Date(date_str)
  if (isNaN(date.getTime())) return null

  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear-ticket")
    .setDescription("Close all tickets opened before a specific date")
    .addStringOption((option) =>
      option
        .setName("before")
        .setDescription("Close tickets opened before this date (YYYY-MM-DD)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember

    // - PERMISSION CHECK - \\
    if (!is_admin_or_mod(member)) {
      await interaction.reply({
        content   : "You don't have permission to use this command.",
        ephemeral : true,
      })
      return
    }

    if (!interaction.guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    const date_str    = interaction.options.getString("before", true)
    const before_date = parse_date(date_str)

    if (!before_date) {
      await interaction.reply({
        content   : "Invalid date format. Please use YYYY-MM-DD format (e.g., 2026-01-15).",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      // - RELOAD TICKETS FROM DATABASE - \\
      await load_all_tickets()

      const tickets_from_db = await get_tickets_before_date(before_date)
      const active_threads  = await get_active_threads_before_date(before_date, interaction.guild)

      const ticket_map = new Map<string, TicketData>()
      for (const ticket of tickets_from_db) {
        ticket_map.set(ticket.thread_id, ticket)
      }
      for (const thread of active_threads) {
        if (!ticket_map.has(thread.thread_id)) {
          ticket_map.set(thread.thread_id, thread)
        }
      }

      const tickets = Array.from(ticket_map.values())

      if (tickets.length === 0) {
        await interaction.editReply({
          content: `No tickets found opened before **${date_str}**.`,
        })
        return
      }

      // - SEND CONFIRMATION - \\
      const confirmation = build_confirmation_message(tickets.length, date_str)

      const reply = await interaction.editReply({
        ...confirmation,
        flags: MessageFlags.IsComponentsV2,
      })

      // - WAIT FOR BUTTON INTERACTION - \\
      const collector = reply.createMessageComponentCollector({
        time: 60000,
      })

      collector.on("collect", async (button_interaction) => {
        if (button_interaction.user.id !== interaction.user.id) {
          await button_interaction.reply({
            content   : "This is not your confirmation.",
            ephemeral : true,
          })
          return
        }

        if (button_interaction.customId === "clear_ticket_cancel") {
          await button_interaction.update({
            ...build_simple_message("Operation cancelled."),
            flags: MessageFlags.IsComponentsV2,
          })
          collector.stop()
          return
        }

        if (button_interaction.customId === "clear_ticket_confirm") {
          await button_interaction.update({
            ...build_progress_message(0, 0, tickets.length, date_str),
            flags: MessageFlags.IsComponentsV2,
          })

          let closed = 0
          let failed = 0

          for (const [index, ticket] of tickets.entries()) {
            try {
              const channel = await client.channels.fetch(ticket.thread_id).catch(() => null)

              if (channel && channel.type === ChannelType.PublicThread) {
                const thread = channel as ThreadChannel

                if (!thread.archived) {
                  await close_ticket({
                    thread,
                    client,
                    closed_by : interaction.user,
                    reason    : `Bulk close - tickets before ${date_str}`,
                  })
                  closed++
                } else {
                  closed++
                }
              } else {
                // - CHANNEL NOT FOUND, DELETE FROM DATABASE - \\
                if (db.is_connected()) {
                  await db.delete_one(TICKETS_COLLECTION, { thread_id: ticket.thread_id })
                }
                closed++
              }

              // - PROGRESS UPDATE - \\
              if ((index + 1) % 25 === 0 || index + 1 === tickets.length) {
                await interaction.editReply({
                  ...build_progress_message(closed, failed, tickets.length, date_str),
                  flags: MessageFlags.IsComponentsV2,
                }).catch(() => {})
              }

              // - DELAY TO AVOID RATE LIMITING - \\
              await new Promise(resolve => setTimeout(resolve, 300))
            } catch (error) {
              failed++
              log_error(client, error as Error, "clear_ticket", { thread_id: ticket.thread_id })
            }
          }

          const result_message = build_result_message(closed, failed, date_str)

          await interaction.editReply({
            ...result_message,
            flags: MessageFlags.IsComponentsV2,
          })

          collector.stop()
        }
      })

      collector.on("end", async (_, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            ...build_simple_message("Confirmation timed out."),
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => {})
        }
      })
    } catch (error) {
      log_error(client, error as Error, "clear_ticket")
      await interaction.editReply({
        content: "An error occurred while processing the command.",
      })
    }
  },
}
