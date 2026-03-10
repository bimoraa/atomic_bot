/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Guild, GuildMember } from "discord.js"

// - QUARANTINE CONTROLLER OPTION INTERFACES - \\
export interface quarantine_member_options {
  client   : Client
  guild    : Guild
  executor : GuildMember
  target   : GuildMember
  days     : number
  reason   : string
}

export interface release_quarantine_options {
  client  : Client
  guild   : Guild
  user_id : string
}
