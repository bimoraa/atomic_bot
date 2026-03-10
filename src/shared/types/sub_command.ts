/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Message, Client } from "discord.js"

export interface SubCommand {
  name       : string
  description: string
  execute    : (message: Message, args: string[], client: Client) => Promise<void>
}
