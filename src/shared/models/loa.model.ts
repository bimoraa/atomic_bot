/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client } from "discord.js"
import { LoaStatus } from "@shared/enums"

// - LOA DB MODEL - \\
export interface loa_data {
  _id?               : any
  message_id         : string
  user_id            : string
  user_tag           : string
  start_date         : number
  end_date           : number
  type               : string
  reason             : string
  status             : LoaStatus | "pending" | "approved" | "rejected" | "ended"
  approved_by?       : string
  rejected_by?       : string
  original_nickname? : string
  created_at         : number
  guild_id?          : string
  channel_id?        : string
}

// - CONTROLLER OPTION INTERFACES - \\
export interface request_loa_options {
  user_id    : string
  user_tag   : string
  client     : Client
  end_date   : string
  type       : string
  reason     : string
  guild_id?  : string
  channel_id?: string
}

export interface approve_loa_options {
  message_id  : string
  approver_id : string
  client      : Client
  guild_id    : string
}

export interface reject_loa_options {
  message_id  : string
  rejector_id : string
  client      : Client
}

export interface end_loa_options {
  message_id : string
  ender_id   : string
  client     : Client
  guild_id   : string
}
