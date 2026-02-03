import { Client } from "discord.js"
import { logger } from "../../../shared/utils"
import { load_active_tickets } from "../../../shared/database/managers/middleman_manager"
import { set_user_open_ticket } from "../../../shared/database/unified_ticket"

const log = logger.create_logger("load_middleman_tickets")

/**
 * @description Load all active middleman tickets from database on startup
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
export async function load_middleman_tickets_on_startup(client: Client): Promise<void> {
  try {
    log.info("Loading active middleman tickets from database")

    const active_tickets = await load_active_tickets()

    if (active_tickets.length === 0) {
      log.info("No active middleman tickets found")
      return
    }

    let loaded_count = 0
    let error_count = 0

    for (const ticket of active_tickets) {
      try {
        // - VERIFY THREAD STILL EXISTS - \\
        const thread = await client.channels.fetch(ticket.thread_id).catch((err) => {
          if (err.code === 10003 || err.code === 50001 || err.code === 10008) return null // Unknown Channel / Missing Access / Unknown Message
          throw err
        })

        if (thread && thread.isThread() && !thread.locked && !thread.archived) {
          // - SET USER OPEN TICKET IN MEMORY - \\
          set_user_open_ticket("middleman", ticket.requester_id, ticket.thread_id)
          loaded_count++
          log.info(`Loaded ticket ${ticket.ticket_id} for user ${ticket.requester_id}`)
        } else {
          log.warn(`Thread ${ticket.thread_id} for ticket ${ticket.ticket_id} not found or closed`)
          error_count++
        }
      } catch (error) {
        log.error(`Failed to load ticket ${ticket.ticket_id}:`, error)
        error_count++
      }
    }

    log.info(`Loaded ${loaded_count} active middleman tickets (${error_count} errors)`)
  } catch (error) {
    log.error("Failed to load middleman tickets:", error)
  }
}
