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
