/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - content creator salary db manager - \\
// - content creator 工资数据库管理器 - \\

import { db }                                                   from "../../utils"
import { cc_salary_data, cc_salary_log_data, cc_invite_data }  from "@models/cc_salary.model"

const __collection_salary = "cc_salary"
const __collection_log    = "cc_salary_log"
const __collection_invite = "cc_invites"
const __salary_per_sale   = 2500

// ─── salary balance ────────────────────────────────────────────

/**
 * @description get cc salary record
 * @param {string} cc_id    - content creator user id
 * @param {string} guild_id - guild id
 * @returns {Promise<cc_salary_data | null>}
 */
export async function get_salary(cc_id: string, guild_id: string): Promise<cc_salary_data | null> {
  return db.find_one<cc_salary_data>(__collection_salary, { cc_id, guild_id })
}

/**
 * @description get all cc salary records for a guild
 * @param {string} guild_id - guild id
 * @returns {Promise<cc_salary_data[]>}
 */
export async function get_all_salaries(guild_id: string): Promise<cc_salary_data[]> {
  return db.find_many<cc_salary_data>(__collection_salary, { guild_id })
}

/**
 * @description add earning to cc balance after a script purchase
 * @param {string} cc_id       - content creator user id
 * @param {string} guild_id    - guild id
 * @param {string} customer_id - the customer who bought
 * @param {string} performed_by - who triggered (system or admin)
 * @returns {Promise<void>}
 */
export async function add_earning(cc_id: string, guild_id: string, customer_id: string, performed_by: string): Promise<void> {
  const existing = await get_salary(cc_id, guild_id)
  const now      = Math.floor(Date.now() / 1000)

  const new_earned = (existing?.total_earned ?? 0) + __salary_per_sale
  const new_balance = (existing?.balance ?? 0) + __salary_per_sale
  const new_sales  = (existing?.total_sales ?? 0) + 1

  await db.update_one<cc_salary_data>(
    __collection_salary,
    { cc_id, guild_id },
    {
      cc_id,
      guild_id,
      total_earned   : new_earned,
      total_withdrawn: existing?.total_withdrawn ?? 0,
      balance        : new_balance,
      total_invites  : existing?.total_invites ?? 0,
      total_sales    : new_sales,
      updated_at     : now,
    },
    true,
  )

  await insert_log({
    cc_id,
    guild_id,
    type        : "earning",
    amount      : __salary_per_sale,
    customer_id,
    note        : `Script purchase by <@${customer_id}>`,
    performed_by,
    created_at  : now,
  })
}

/**
 * @description manually add salary amount
 * @param {string} cc_id        - content creator user id
 * @param {string} guild_id     - guild id
 * @param {number} amount       - amount to add
 * @param {string} performed_by - admin who added
 * @param {string} note         - reason
 * @returns {Promise<void>}
 */
export async function add_manual(cc_id: string, guild_id: string, amount: number, performed_by: string, note: string): Promise<void> {
  const existing = await get_salary(cc_id, guild_id)
  const now      = Math.floor(Date.now() / 1000)

  await db.update_one<cc_salary_data>(
    __collection_salary,
    { cc_id, guild_id },
    {
      cc_id,
      guild_id,
      total_earned   : (existing?.total_earned ?? 0) + amount,
      total_withdrawn: existing?.total_withdrawn ?? 0,
      balance        : (existing?.balance ?? 0) + amount,
      total_invites  : existing?.total_invites ?? 0,
      total_sales    : existing?.total_sales ?? 0,
      updated_at     : now,
    },
    true,
  )

  await insert_log({
    cc_id,
    guild_id,
    type        : "manual_add",
    amount,
    note,
    performed_by,
    created_at  : now,
  })
}

/**
 * @description reset cc salary balance to 0
 * @param {string} cc_id        - content creator user id
 * @param {string} guild_id     - guild id
 * @param {string} performed_by - admin who reset
 * @returns {Promise<number>} previous balance
 */
export async function reset_salary(cc_id: string, guild_id: string, performed_by: string): Promise<number> {
  const existing      = await get_salary(cc_id, guild_id)
  const prev_balance  = existing?.balance ?? 0
  const now           = Math.floor(Date.now() / 1000)

  await db.update_one<cc_salary_data>(
    __collection_salary,
    { cc_id, guild_id },
    {
      cc_id,
      guild_id,
      total_earned   : existing?.total_earned ?? 0,
      total_withdrawn: existing?.total_withdrawn ?? 0,
      balance        : 0,
      total_invites  : existing?.total_invites ?? 0,
      total_sales    : existing?.total_sales ?? 0,
      updated_at     : now,
    },
    true,
  )

  await insert_log({
    cc_id,
    guild_id,
    type        : "reset",
    amount      : prev_balance,
    note        : `Balance reset from Rp ${prev_balance.toLocaleString("id-ID")}`,
    performed_by,
    created_at  : now,
  })

  return prev_balance
}

/**
 * @description withdraw cc salary
 * @param {string} cc_id        - content creator user id
 * @param {string} guild_id     - guild id
 * @param {number} amount       - withdraw amount
 * @param {string} performed_by - admin who processed
 * @param {string} note         - withdrawal note
 * @returns {Promise<boolean>} success
 */
export async function withdraw_salary(cc_id: string, guild_id: string, amount: number, performed_by: string, note: string): Promise<boolean> {
  const existing = await get_salary(cc_id, guild_id)
  if (!existing || existing.balance < amount) return false

  const now = Math.floor(Date.now() / 1000)

  await db.update_one<cc_salary_data>(
    __collection_salary,
    { cc_id, guild_id },
    {
      cc_id,
      guild_id,
      total_earned   : existing.total_earned,
      total_withdrawn: existing.total_withdrawn + amount,
      balance        : existing.balance - amount,
      total_invites  : existing.total_invites,
      total_sales    : existing.total_sales,
      updated_at     : now,
    },
    true,
  )

  await insert_log({
    cc_id,
    guild_id,
    type        : "withdraw",
    amount,
    note,
    performed_by,
    created_at  : now,
  })

  return true
}

// ─── invite tracking ───────────────────────────────────────────

/**
 * @description record a cc invite
 * @param {string} cc_id           - content creator user id
 * @param {string} invited_user_id - invited member id
 * @param {string} guild_id        - guild id
 * @param {string} invite_code     - invite code used
 * @returns {Promise<void>}
 */
export async function record_invite(cc_id: string, invited_user_id: string, guild_id: string, invite_code: string): Promise<void> {
  const now      = Math.floor(Date.now() / 1000)
  const existing = await get_salary(cc_id, guild_id)

  await db.insert_one<cc_invite_data>(__collection_invite, {
    cc_id,
    invited_user_id,
    guild_id,
    invite_code,
    joined_at: now,
  })

  await db.update_one<cc_salary_data>(
    __collection_salary,
    { cc_id, guild_id },
    {
      cc_id,
      guild_id,
      total_earned   : existing?.total_earned ?? 0,
      total_withdrawn: existing?.total_withdrawn ?? 0,
      balance        : existing?.balance ?? 0,
      total_invites  : (existing?.total_invites ?? 0) + 1,
      total_sales    : existing?.total_sales ?? 0,
      updated_at     : now,
    },
    true,
  )
}

/**
 * @description find which cc invited a user
 * @param {string} invited_user_id - user who joined
 * @param {string} guild_id        - guild id
 * @returns {Promise<cc_invite_data | null>}
 */
export async function find_inviter(invited_user_id: string, guild_id: string): Promise<cc_invite_data | null> {
  return db.find_one<cc_invite_data>(__collection_invite, { invited_user_id, guild_id })
}

/**
 * @description get all invites by a cc
 * @param {string} cc_id    - content creator user id
 * @param {string} guild_id - guild id
 * @returns {Promise<cc_invite_data[]>}
 */
export async function get_invites_by_cc(cc_id: string, guild_id: string): Promise<cc_invite_data[]> {
  return db.find_many<cc_invite_data>(__collection_invite, { cc_id, guild_id })
}

// ─── salary log ────────────────────────────────────────────────

/**
 * @description insert a salary log entry
 * @param {cc_salary_log_data} log - log entry
 * @returns {Promise<void>}
 */
async function insert_log(log: cc_salary_log_data): Promise<void> {
  await db.insert_one<cc_salary_log_data>(__collection_log, log)
}

/**
 * @description get salary logs for a cc
 * @param {string} cc_id    - content creator user id
 * @param {string} guild_id - guild id
 * @returns {Promise<cc_salary_log_data[]>}
 */
export async function get_logs(cc_id: string, guild_id: string): Promise<cc_salary_log_data[]> {
  return db.find_many<cc_salary_log_data>(__collection_log, { cc_id, guild_id })
}
