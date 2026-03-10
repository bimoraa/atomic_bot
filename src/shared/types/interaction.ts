/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js"

export interface ButtonHandler {
  custom_id : string | RegExp
  execute   : (interaction: ButtonInteraction) => Promise<void>
}

export interface ModalHandler {
  custom_id : string | RegExp
  execute   : (interaction: ModalSubmitInteraction) => Promise<void>
}

export interface StringSelectMenuHandler {
  custom_id : string | RegExp
  execute   : (interaction: StringSelectMenuInteraction) => Promise<void>
}

export interface UserSelectMenuHandler {
  custom_id : string | RegExp
  execute   : (interaction: UserSelectMenuInteraction) => Promise<void>
}
