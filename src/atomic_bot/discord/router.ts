/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 所有交互的总调度中心，按钮、弹窗、菜单全从这分发 - \\
// - main interaction dispatcher, all buttons/modals/selects get dispatched from here - \\
// - thanks to @_lyi for the logic rewrite - \\
import {
  Client,
  Collection,
  Interaction,
  GuildMember,
  AutocompleteInteraction,
}                                                            from "discord.js"
import { Command, MessageContextMenuCommand }                from "@shared/types/command"
import { can_use_command }                                   from "@database/settings/command_permissions"
import { log_error, handle_error_log_button }                from "@utils/error_logger"
import { component }                                         from "@utils"
import {
  handle_ticket_button,
  handle_ticket_modal,
  handle_ticket_select_menu,
  handle_ticket_user_select,
}                                                            from "@database/unified_ticket"

import { run_middleware }                                                  from "@shared/middleware/runner"
import { error_handler }                                                   from "@shared/middleware/error.handler"

import { get_button_module, get_modal_module, get_select_menu_module }     from "./interaction-registry"
import { button_exact }                                                     from "@discord/dispatchers/button.exact"
import { button_prefix }                                                    from "@discord/dispatchers/button.prefix"
import { select_exact }                                                     from "@discord/dispatchers/select.exact"
import { select_prefix }                                                    from "@discord/dispatchers/select.prefix"
import { modal_exact }                                                      from "@discord/dispatchers/modal.exact"
import { modal_prefix }                                                     from "@discord/dispatchers/modal.prefix"

// - 直接调用的选择菜单和按钮模块（不走分发表） - \\
// - select menu and button modules called directly (not via dispatch tables) - \\
const tempvoice_select = get_select_menu_module("tempvoice")
const middleman_select = get_select_menu_module("middleman")
const middleman_buttons = get_button_module("middleman")

// - 直接调用的模态框模块（不走分发表） - \\
// - modal modules called directly (not via dispatch tables) - \\
const staff_modal          = get_modal_module("staff")
const tempvoice_modal      = get_modal_module("tempvoice")
const reminder_modal       = get_modal_module("reminder")
const loa_modal            = get_modal_module("loa")
const scripts_modal        = get_modal_module("scripts")
const middleman_modal      = get_modal_module("middleman")
const share_settings_modal = get_modal_module("share-settings")
const staff_info_modal     = get_modal_module("staff-info")

// - 命令中间件链，避免每次调用时动态分配数组 - \\
// - command middleware chain, avoids dynamic array allocation per invocation - \\
const __command_middleware = [error_handler]

/**
 * @description 处理所有 Discord 交互事件，包括按钮、选择菜单、模态框、命令
 * @param {Interaction} interaction - discord interaction object
 * @param {Client & { commands: Collection<string, Command> }} client - discord client with commands
 * @returns {Promise<void>}
 */
export async function handle_interaction(
  interaction: Interaction,
  client: Client & { commands: Collection<string, Command> }
) {
  // - 字符串选择菜单路由 - \\
  // - string select menu routing - \\
  if (interaction.isStringSelectMenu()) {
    try {
      const exact = select_exact.get(interaction.customId)
      if (exact) { await exact(interaction); return }

      for (const [prefix, handler] of select_prefix) {
        if (interaction.customId.startsWith(prefix)) { await handler(interaction); return }
      }

      if (await tempvoice_select.handle_tempvoice_region_select(interaction)) return
      if (await handle_ticket_select_menu(interaction))                        return
    } catch (err) {
      console.log("[ - SELECT MENU - ] error:", err)
      await log_error(client, err as Error, "StringSelectMenu", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
    }
  }

  // - 用户选择菜单路由 - \\
  // - user select menu routing - \\
  if (interaction.isUserSelectMenu()) {
    try {
      if (await handle_ticket_user_select(interaction))                       return
      if (await middleman_select.handle_middleman_seller_select(interaction)) return
      if (await middleman_select.handle_middleman_buyer_select(interaction))  return
      if (await middleman_select.handle_middleman_partner_select(interaction)) return
      if (await middleman_select.handle_middleman_member_select(interaction)) return
      if (await tempvoice_select.handle_tempvoice_user_select(interaction))   return
    } catch (err) {
      console.log("[ - USER SELECT - ] error:", err)
      await log_error(client, err as Error, "UserSelectMenu", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
    }
  }

  // - 按钮路由 - \\
  // - button routing - \\
  if (interaction.isButton()) {
    try {
      if (await handle_error_log_button(interaction, client)) return
      if (await handle_ticket_button(interaction))            return

      // - middleman 自检处理器 - \\
      // - middleman self-checking handlers - \\
      if (await middleman_buttons.handle_middleman_close(interaction))        return
      if (await middleman_buttons.handle_middleman_close_reason(interaction)) return
      if (await middleman_buttons.handle_middleman_add_member(interaction))   return
      if (await middleman_buttons.handle_middleman_complete(interaction))     return
      if (await middleman_buttons.handle_middleman_penjual_self(interaction)) return
      if (await middleman_buttons.handle_middleman_pembeli_self(interaction)) return

      const exact = button_exact.get(interaction.customId)
      if (exact) { await exact(interaction, client); return }

      for (const [prefix, handler] of button_prefix) {
        if (interaction.customId.startsWith(prefix)) { await handler(interaction, client); return }
      }
    } catch (err) {
      console.log("[ - BUTTON - ] error:", err)
      await log_error(client, err as Error, "Button", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
    }
  }

  // - 模态框路由 - \\
  // - modal routing - \\
  if (interaction.isModalSubmit()) {
    try {
      if (await handle_ticket_modal(interaction))                                   return
      if (await staff_modal.handle(interaction))                                    return
      if (await tempvoice_modal.handle_tempvoice_modal(interaction))                return

      const exact = modal_exact.get(interaction.customId)
      if (exact) { await exact(interaction); return }

      for (const [prefix, handler] of modal_prefix) {
        if (interaction.customId.startsWith(prefix)) { await handler(interaction); return }
      }

      if (await reminder_modal.handle_reminder_add_new_modal(interaction))          return
      if (await loa_modal.handle_loa_request_modal(interaction))                    return
      if (await scripts_modal.handle_script_redeem_modal(interaction))              return
      if (await middleman_modal.handle_middleman_ticket_details_modal(interaction)) return
      if (await middleman_modal.handle_middleman_close_reason_modal(interaction))   return
      if (await share_settings_modal.handle_share_settings_modal(interaction))      return
      if (await staff_info_modal.handle_edit_staff_info_modal(interaction))         return
    } catch (err) {
      console.log("[ - MODAL - ] error:", err)
      await log_error(client, err as Error, "ModalSubmit", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
    }
  }

  // - 自动补全路由 - \\
  // - autocomplete routing - \\
  if (interaction.isAutocomplete()) {
    const autocomplete_interaction = interaction as AutocompleteInteraction
    const command = client.commands.get(autocomplete_interaction.commandName)
    if (!command?.autocomplete) return

    try {
      await command.autocomplete(autocomplete_interaction)
    } catch (error) {
      await log_error(client, error as Error, `Autocomplete: ${autocomplete_interaction.commandName}`, {
        user   : autocomplete_interaction.user.tag,
        guild  : autocomplete_interaction.guild?.name || "DM",
        channel: autocomplete_interaction.channel?.id,
      })
    }
    return
  }

  // - 右键消息菜单命令路由 - \\
  // - right-click message context menu routing - \\
  if (interaction.isMessageContextMenuCommand()) {
    const ctx_cmds = (client as any).message_context_menu_commands as Collection<string, MessageContextMenuCommand> | undefined
    const ctx_cmd  = ctx_cmds?.get(interaction.commandName)
    if (!ctx_cmd) return

    try {
      await ctx_cmd.execute(interaction)
    } catch (error) {
      await log_error(client, error as Error, `ContextMenu: ${interaction.commandName}`, {
        user : interaction.user.tag,
        guild: interaction.guild?.name || "DM",
      })
      const err_message = component.build_message({
        components: [
          component.container({
            components: [component.text("There was an error executing this command.")],
          }),
        ],
      })
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ ...err_message, ephemeral: true })
      } else {
        await interaction.reply({ ...err_message, ephemeral: true })
      }
    }
    return
  }

  // - 斜线命令路由 - \\
  // - slash command routing - \\
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  const member = interaction.member as GuildMember
  if (!can_use_command(member, interaction.commandName)) {
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components: [component.text("You don't have permission to use this command.")],
          }),
        ],
      }),
      ephemeral: true,
    })
    return
  }

  const ctx = { interaction, client }
  await run_middleware(__command_middleware, ctx, async () => {
    await command.execute(interaction)
  })
}
