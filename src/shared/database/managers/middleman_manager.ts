import { db } from "../../utils"

const __collection         = "middleman_transactions"
const __tickets_collection = "middleman_tickets"

export interface MiddlemanTransaction {
  id               : number
  ticket_id        : string
  requester_id     : string
  partner_id       : string
  partner_tag      : string
  transaction_range: string
  fee              : string
  range_id         : string
  completed_by     : string
  completed_at     : number
  thread_id        : string
  guild_id         : string
  created_at       : Date
}

export interface MiddlemanTicket {
  thread_id        : string
  ticket_id        : string
  requester_id     : string
  partner_id       : string
  partner_tag      : string
  transaction_range: string
  fee              : string
  range_id         : string
  guild_id         : string
  status           : "open" | "completed" | "cancelled"
  created_at       : number
  updated_at       : number
  completed_at?    : number
  completed_by?    : string
  close_reason?    : string
  log_message_id?  : string
}

/**
 * @description Create a new middleman ticket in database
 * @param {MiddlemanTicket} ticket - Ticket data
 * @returns {Promise<boolean>} - Success status
 */
export async function create_middleman_ticket(ticket: MiddlemanTicket): Promise<boolean> {
  if (!db.is_connected()) return false
  
  try {
    await db.insert_one(__tickets_collection, ticket)
    console.log(`[ - MIDDLEMAN MANAGER - ] Ticket created: ${ticket.ticket_id}`)
    return true
  } catch (error) {
    console.error(`[ - MIDDLEMAN MANAGER - ] Failed to create ticket:`, error)
    return false
  }
}

/**
 * @description Update middleman ticket in database
 * @param {string} thread_id - Thread ID
 * @param {Partial<MiddlemanTicket>} updates - Updates to apply
 * @returns {Promise<boolean>} - Success status
 */
export async function update_middleman_ticket(thread_id: string, updates: Partial<MiddlemanTicket>): Promise<boolean> {
  if (!db.is_connected()) return false
  
  try {
    await db.update_one(
      __tickets_collection,
      { thread_id },
      { ...updates, updated_at: Math.floor(Date.now() / 1000) },
      false
    )
    console.log(`[ - MIDDLEMAN MANAGER - ] Ticket updated: ${thread_id}`)
    return true
  } catch (error) {
    console.error(`[ - MIDDLEMAN MANAGER - ] Failed to update ticket:`, error)
    return false
  }
}

/**
 * @description Get middleman ticket by thread ID
 * @param {string} thread_id - Thread ID
 * @returns {Promise<MiddlemanTicket | null>} - Ticket or null
 */
export async function get_middleman_ticket(thread_id: string): Promise<MiddlemanTicket | null> {
  if (!db.is_connected()) return null
  return await db.find_one<MiddlemanTicket>(__tickets_collection, { thread_id })
}

/**
 * @description Get all active middleman tickets
 * @returns {Promise<MiddlemanTicket[]>} - Array of active tickets
 */
export async function get_active_middleman_tickets(): Promise<MiddlemanTicket[]> {
  if (!db.is_connected()) return []
  return await db.find_many<MiddlemanTicket>(__tickets_collection, { status: "open" })
}

/**
 * @description Get user's active middleman ticket
 * @param {string} user_id - User ID
 * @returns {Promise<MiddlemanTicket | null>} - Active ticket or null
 */
export async function get_user_active_ticket(user_id: string): Promise<MiddlemanTicket | null> {
  if (!db.is_connected()) return null
  
  const as_requester = await db.find_one<MiddlemanTicket>(__tickets_collection, {
    requester_id: user_id,
    status      : "open"
  })
  
  if (as_requester) return as_requester
  
  return await db.find_one<MiddlemanTicket>(__tickets_collection, {
    partner_id: user_id,
    status    : "open"
  })
}

/**
 * @description Count user's active middleman tickets
 * @param {string} user_id - User ID
 * @returns {Promise<number>} - Number of active tickets
 */
export async function count_user_active_tickets(user_id: string): Promise<number> {
  if (!db.is_connected()) return 0
  
  const as_requester = await db.find_many<MiddlemanTicket>(__tickets_collection, {
    requester_id: user_id,
    status      : "open"
  })
  
  const as_partner = await db.find_many<MiddlemanTicket>(__tickets_collection, {
    partner_id: user_id,
    status    : "open"
  })
  
  return as_requester.length + as_partner.length
}

/**
 * @description Complete a middleman ticket
 * @param {string} thread_id - Thread ID
 * @param {string} completed_by - User who completed the ticket
 * @returns {Promise<boolean>} - Success status
 */
export async function complete_middleman_ticket(thread_id: string, completed_by: string): Promise<boolean> {
  if (!db.is_connected()) return false
  
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    await db.update_one(
      __tickets_collection,
      { thread_id },
      {
        status      : "completed",
        completed_at: timestamp,
        completed_by: completed_by,
        updated_at  : timestamp,
      },
      false
    )
    console.log(`[ - MIDDLEMAN MANAGER - ] Ticket completed: ${thread_id}`)
    return true
  } catch (error) {
    console.error(`[ - MIDDLEMAN MANAGER - ] Failed to complete ticket:`, error)
    return false
  }
}

/**
 * @description Cancel a middleman ticket
 * @param {string} thread_id - Thread ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<boolean>} - Success status
 */
export async function cancel_middleman_ticket(thread_id: string, reason?: string): Promise<boolean> {
  if (!db.is_connected()) return false
  
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    await db.update_one(
      __tickets_collection,
      { thread_id },
      {
        status      : "cancelled",
        close_reason: reason,
        updated_at  : timestamp,
      },
      false
    )
    console.log(`[ - MIDDLEMAN MANAGER - ] Ticket cancelled: ${thread_id}`)
    return true
  } catch (error) {
    console.error(`[ - MIDDLEMAN MANAGER - ] Failed to cancel ticket:`, error)
    return false
  }
}

/**
 * @description Load all active middleman tickets into memory on startup
 * @returns {Promise<MiddlemanTicket[]>} - Array of active tickets
 */
export async function load_active_tickets(): Promise<MiddlemanTicket[]> {
  if (!db.is_connected()) return []
  
  const tickets = await get_active_middleman_tickets()
  console.log(`[ - MIDDLEMAN MANAGER - ] Loaded ${tickets.length} active tickets`)
  return tickets
}

/**
 * @description Get all middleman transactions
 * @returns {Promise<MiddlemanTransaction[]>} - Array of transactions
 */
export async function get_all_transactions(): Promise<MiddlemanTransaction[]> {
  if (!db.is_connected()) return []
  return await db.find_many<MiddlemanTransaction>(__collection, {})
}

/**
 * @description Get transactions by user (either requester or partner)
 * @param {string} user_id - User ID
 * @returns {Promise<MiddlemanTransaction[]>} - Array of transactions
 */
export async function get_user_transactions(user_id: string): Promise<MiddlemanTransaction[]> {
  if (!db.is_connected()) return []
  
  const as_requester = await db.find_many<MiddlemanTransaction>(__collection, { requester_id: user_id })
  const as_partner   = await db.find_many<MiddlemanTransaction>(__collection, { partner_id: user_id })
  
  return [...as_requester, ...as_partner]
}

/**
 * @description Get transaction by ticket ID
 * @param {string} ticket_id - Ticket ID
 * @returns {Promise<MiddlemanTransaction | null>} - Transaction or null
 */
export async function get_transaction_by_ticket(ticket_id: string): Promise<MiddlemanTransaction | null> {
  if (!db.is_connected()) return null
  return await db.find_one<MiddlemanTransaction>(__collection, { ticket_id })
}

/**
 * @description Get transaction statistics
 * @returns {Promise<{total: number, total_this_month: number}>} - Statistics
 */
export async function get_transaction_stats(): Promise<{ total: number; total_this_month: number }> {
  if (!db.is_connected()) return { total: 0, total_this_month: 0 }
  
  const all_transactions = await db.find_many<MiddlemanTransaction>(__collection, {})
  const now              = new Date()
  const month_start      = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
  
  const this_month = all_transactions.filter(t => t.completed_at >= month_start)
  
  return {
    total           : all_transactions.length,
    total_this_month: this_month.length,
  }
}
