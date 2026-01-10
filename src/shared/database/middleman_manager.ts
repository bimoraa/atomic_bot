import { db } from "../utils"

const COLLECTION = "middleman_transactions"

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

/**
 * @description Get all middleman transactions
 * @returns {Promise<MiddlemanTransaction[]>} - Array of transactions
 */
export async function get_all_transactions(): Promise<MiddlemanTransaction[]> {
  if (!db.is_connected()) return []
  return await db.find_many<MiddlemanTransaction>(COLLECTION, {})
}

/**
 * @description Get transactions by user (either requester or partner)
 * @param {string} user_id - User ID
 * @returns {Promise<MiddlemanTransaction[]>} - Array of transactions
 */
export async function get_user_transactions(user_id: string): Promise<MiddlemanTransaction[]> {
  if (!db.is_connected()) return []
  
  const as_requester = await db.find_many<MiddlemanTransaction>(COLLECTION, { requester_id: user_id })
  const as_partner   = await db.find_many<MiddlemanTransaction>(COLLECTION, { partner_id: user_id })
  
  return [...as_requester, ...as_partner]
}

/**
 * @description Get transaction by ticket ID
 * @param {string} ticket_id - Ticket ID
 * @returns {Promise<MiddlemanTransaction | null>} - Transaction or null
 */
export async function get_transaction_by_ticket(ticket_id: string): Promise<MiddlemanTransaction | null> {
  if (!db.is_connected()) return null
  return await db.find_one<MiddlemanTransaction>(COLLECTION, { ticket_id })
}

/**
 * @description Get transaction statistics
 * @returns {Promise<{total: number, total_this_month: number}>} - Statistics
 */
export async function get_transaction_stats(): Promise<{ total: number; total_this_month: number }> {
  if (!db.is_connected()) return { total: 0, total_this_month: 0 }
  
  const all_transactions = await db.find_many<MiddlemanTransaction>(COLLECTION, {})
  const now              = new Date()
  const month_start      = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
  
  const this_month = all_transactions.filter(t => t.completed_at >= month_start)
  
  return {
    total           : all_transactions.length,
    total_this_month: this_month.length,
  }
}
