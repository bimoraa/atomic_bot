import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  Interaction,
  Client,
} from "discord.js"
import {
  ButtonHandler,
  ModalHandler,
  StringSelectMenuHandler,
  UserSelectMenuHandler,
} from "../types/interaction"
import { log_error } from "./error_logger"

export class InteractionRegistry {
  private buttons            : ButtonHandler[]           = []
  private modals             : ModalHandler[]            = []
  private string_select_menus: StringSelectMenuHandler[] = []
  private user_select_menus  : UserSelectMenuHandler[]   = []

  public register_button(handler: ButtonHandler): void {
    this.buttons.push(handler)
  }

  public register_modal(handler: ModalHandler): void {
    this.modals.push(handler)
  }

  public register_string_select_menu(handler: StringSelectMenuHandler): void {
    this.string_select_menus.push(handler)
  }

  public register_user_select_menu(handler: UserSelectMenuHandler): void {
    this.user_select_menus.push(handler)
  }

  private is_match(custom_id: string, pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      return custom_id === pattern || custom_id.startsWith(pattern)
    }
    return pattern.test(custom_id)
  }

  public async handle_interaction(interaction: Interaction, client: Client): Promise<void> {
    try {
      if (interaction.isButton()) {
        for (const handler of this.buttons) {
          if (this.is_match(interaction.customId, handler.custom_id)) {
            await handler.execute(interaction as ButtonInteraction)
            return
          }
        }

        // - FALLBACK: UNKNOWN BUTTON - \\
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content  : "This button is no longer active.",
            ephemeral: true,
          }).catch(() => {})
        }
      } 
      
      else if (interaction.isModalSubmit()) {
        for (const handler of this.modals) {
          if (this.is_match(interaction.customId, handler.custom_id)) {
            await handler.execute(interaction as ModalSubmitInteraction)
            return
          }
        }
      } 
      
      else if (interaction.isStringSelectMenu()) {
        for (const handler of this.string_select_menus) {
          if (this.is_match(interaction.customId, handler.custom_id)) {
            await handler.execute(interaction as StringSelectMenuInteraction)
            return
          }
        }
      } 
      
      else if (interaction.isUserSelectMenu()) {
        for (const handler of this.user_select_menus) {
          if (this.is_match(interaction.customId, handler.custom_id)) {
            await handler.execute(interaction as UserSelectMenuInteraction)
            return
          }
        }
      }
    } catch (err) {
      console.error(`[ - INTERACTION - ] Error handling ${interaction.isCommand() ? "command" : "component"}:`, err)
      await log_error(client, err as Error, "Interaction Router", {
        custom_id: (interaction as any).customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => {})
      }
    }
  }
}

// - GLOBAL INSTANCE - \\
export const interactions = new InteractionRegistry()
