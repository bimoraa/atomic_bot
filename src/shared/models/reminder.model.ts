/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client } from "discord.js"

// - REMINDER DB MODEL - \\
export interface reminder_data {
  _id?       : any
  user_id    : string
  note       : string
  remind_at  : number
  created_at : number
  guild_id?  : string
}

// - CONTROLLER OPTION INTERFACES - \\
export interface reminder_list_options {
  user_id: string
  client : Client
}

export interface add_reminder_options {
  user_id   : string
  client    : Client
  minutes   : number
  note      : string
  guild_id? : string
}

export interface cancel_reminder_options {
  user_id    : string
  client     : Client
  remind_at? : number
}
