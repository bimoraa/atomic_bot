/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - content creator salary db model - \\
// - content creator 工资数据库模型 - \\

// - cc salary balance record - \\
export interface cc_salary_data {
  _id?           : any
  cc_id          : string
  guild_id       : string
  total_earned   : number
  total_withdrawn: number
  balance        : number
  total_invites  : number
  total_sales    : number
  updated_at     : number
}

// - cc salary log entry - \\
export interface cc_salary_log_data {
  _id?        : any
  cc_id       : string
  guild_id    : string
  type        : "earning" | "manual_add" | "reset" | "withdraw"
  amount      : number
  customer_id?: string
  note        : string
  performed_by: string
  created_at  : number
}

// - cc invite tracking record - \\
export interface cc_invite_data {
  _id?           : any
  cc_id          : string
  invited_user_id: string
  guild_id       : string
  invite_code    : string
  joined_at      : number
}
