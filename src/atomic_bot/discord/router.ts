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
  ButtonInteraction,
  AutocompleteInteraction,
}                                                            from "discord.js"
import { Command, MessageContextMenuCommand }                from "@shared/types/command"
import { can_use_command }                                   from "@shared/database/settings/command_permissions"
import { log_error, handle_error_log_button }                from "@shared/utils/error_logger"
import { component }                                         from "@shared/utils"
import {
  handle_ticket_button,
  handle_ticket_modal,
  handle_ticket_select_menu,
  handle_ticket_user_select,
}                                                            from "@shared/database/unified_ticket"

import { run_middleware }                                                  from "@shared/middleware/runner"
import { error_handler }                                                  from "@shared/middleware/error.handler"

import { handle_role_permission_select }                                   from "@atomic/features/commands/server-util/utility/get_role_permission.commands"
import { get_button_module, get_modal_module, get_select_menu_module }     from "./interaction-registry"

const stats_select           = get_select_menu_module("stats")
const guide_select           = get_select_menu_module("guide")
const reminder_select        = get_select_menu_module("reminder")
const middleman_select       = get_select_menu_module("middleman")
const share_settings_select  = get_select_menu_module("share-settings")
const staff_info_select      = get_select_menu_module("staff-info")
const tempvoice_select       = get_select_menu_module("tempvoice")
const work_select            = get_select_menu_module("work")
const version_select         = get_select_menu_module("version")
const account_tracker_select = get_select_menu_module("account-tracker")

const ask_buttons            = get_button_module("ask")
const community_buttons      = get_button_module("community")
const close_request_buttons  = get_button_module("close-request")
const reaction_role_buttons  = get_button_module("reaction-roles")
const payment_buttons        = get_button_module("payment")
const guide_buttons          = get_button_module("guide")
const scripts_buttons        = get_button_module("scripts")
const free_scripts_buttons   = get_button_module("free-scripts")
const work_buttons           = get_button_module("work")
const tempvoice_buttons      = get_button_module("tempvoice")
const reminder_buttons       = get_button_module("reminder")
const loa_buttons            = get_button_module("loa")
const booster_buttons        = get_button_module("booster")
const quarantine_buttons     = get_button_module("quarantine")
const av_checker_buttons     = get_button_module("av-checker")
const middleman_buttons      = get_button_module("middleman")
const share_settings_buttons = get_button_module("share-settings")
const staff_info_buttons     = get_button_module("staff-info")
const music_buttons          = get_button_module("music")

const staff_modal          = get_modal_module("staff")
const ask_modal            = get_modal_module("ask")
const loa_modal            = get_modal_module("loa")
const server_modal         = get_modal_module("server")
const reminder_modal       = get_modal_module("reminder")
const scripts_modal        = get_modal_module("scripts")
const tempvoice_modal      = get_modal_module("tempvoice")
const community_modal      = get_modal_module("community")
const middleman_modal      = get_modal_module("middleman")
const share_settings_modal = get_modal_module("share-settings")
const staff_info_modal     = get_modal_module("staff-info")

// - 模块级别的中间件链，避免每次指令调用时动态分配数组 - \\
// - module-level middleware chain, avoids re-allocating the array on every command invocation - \\
const __command_middleware = [error_handler]

// - 反垃圾按钮逻辑，太小了就懒得单开一个文件了 - \\
// - anti spam button logic, too small for its own file - \\

/**
 * @description handles anti-spam action buttons (untimeout, ban, download)
 * @param {ButtonInteraction} interaction - the button interaction
 * @param {Client} client - discord client for error logging
 * @returns {Promise<void>}
 */
async function handle_anti_spam_button(interaction: ButtonInteraction, client: Client): Promise<void> {
  try {
    const parts      = interaction.customId.split(":")
    const action     = parts[0]
    const target_id  = parts[1]
    const message_id = parts[2]

    if (!target_id) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({ components: [component.text("Target not found")] }),
          ],
        }), ephemeral: true,
      })
      return
    }

    const guild = interaction.guild
    if (!guild) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({ components: [component.text("Guild not found")] }),
          ],
        }), ephemeral: true,
      })
      return
    }

    // - 解除超时 - \\
    // - untimeout the dude - \\
    if (action === "anti_spam_untimeout") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (!member) {
        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({ components: [component.text("User not found in guild")] }),
            ],
          }), ephemeral: true,
        })
        return
      }
      await member.timeout(null, "Anti-Spam untimeout")
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({ components: [component.text("User un-timed out")] }),
          ],
        }), ephemeral: true,
      })
      return
    }

    // - 封禁用户，先找成员再直接用ID封禁 - \\
    // - ban user, try member first then raw id ban - \\
    if (action === "anti_spam_ban") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (member) {
        await member.ban({ reason: "Anti-Spam ban" })
      } else {
        await guild.bans.create(target_id, { reason: "Anti-Spam ban" }).catch(async () => {
          await interaction.reply({
            ...component.build_message({
              components: [
                component.container({ components: [component.text("Failed to ban user")] }),
              ],
            }), ephemeral: true,
          })
        })
      }
      if (!interaction.replied) {
        await interaction.reply({
          ...component.build_message({
            components: [
              component.container({ components: [component.text("User banned")] }),
            ],
          }), ephemeral: true,
        })
      }
      return
    }

    // - 下载目标消息信息 - \\
    // - show info about the flagged message - \\
    if (action === "anti_spam_download") {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `Target: <@${target_id}>`,
                  `Message ID: ${message_id || "N/A"}`,
                ]),
              ],
            }),
          ],
        }), ephemeral: true,
      })
      return
    }

    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({ components: [component.text("Unknown action")] }),
        ],
      }), ephemeral: true,
    })
  } catch (err) {
    console.log("[ - ANTI SPAM BUTTON - ] error:", err)
    await log_error(client, err as Error, "Anti-Spam Button", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })
    if (!interaction.replied) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({ components: [component.text("Error handling action")] }),
          ],
        }), ephemeral: true,
      }).catch(() => {})
    }
  }
}

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
      if (interaction.customId === "role_permission_select") {
        await handle_role_permission_select(interaction, interaction.values[0])
        return
      }
      if (interaction.customId === "answer_stats_select") {
        await stats_select.handle_answer_stats_select(interaction)
        return
      }
      if (interaction.customId === "payment_method_select") {
        await stats_select.handle_payment_method_select(interaction)
        return
      }
      if (interaction.customId === "guide_select") {
        await guide_select.handle_guide_select(interaction)
        return
      }
      if (interaction.customId.startsWith("guide_lang_")) {
        await guide_select.handle_guide_language_select(interaction)
        return
      }
      if (interaction.customId === "version_platform_select") {
        await version_select.handle_version_platform_select(interaction)
        return
      }
      if (interaction.customId === "work_stats_week_select") {
        await work_select.handle_work_stats_week_select(interaction)
        return
      }
      if (interaction.customId === "all_staff_work_year_select") {
        await work_select.handle_all_staff_work_year_select(interaction)
        return
      }
      if (interaction.customId === "all_staff_work_week_select") {
        await work_select.handle_all_staff_work_week_select(interaction)
        return
      }
      if (interaction.customId === "reminder_cancel_select") {
        await reminder_select.handle_reminder_cancel_select(interaction)
        return
      }
      if (interaction.customId.startsWith("script_update_select:")) {
        await scripts_buttons.handle_script_update_select(interaction)
        return
      }
      if (interaction.customId.startsWith("middleman_fee_select:")) {
        await middleman_select.handle_middleman_fee_select(interaction)
        return
      }
      if (interaction.customId === "middleman_transaction_range_select") {
        await middleman_select.handle_middleman_transaction_range_select(interaction)
        return
      }
      if (interaction.customId.startsWith("share_settings_select:")) {
        await share_settings_select.handle_share_settings_select(interaction)
        return
      }
      if (
        interaction.customId.startsWith("share_settings_pick_rod:") ||
        interaction.customId.startsWith("share_settings_pick_skin:")
      ) {
        await share_settings_select.handle_share_settings_picker(interaction)
        return
      }
      if (interaction.customId === "staff_info_lang_select") {
        await staff_info_select.handle_staff_info_lang_select(interaction)
        return
      }
      if (await tempvoice_select.handle_tempvoice_region_select(interaction)) return
      if (await handle_ticket_select_menu(interaction)) return
      if (interaction.customId.startsWith("account_tracker_select:")) {
        await account_tracker_select.handle_account_tracker_select(interaction)
        return
      }
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
      if (await handle_ticket_user_select(interaction)) return
      if (await middleman_select.handle_middleman_seller_select(interaction)) return
      if (await middleman_select.handle_middleman_buyer_select(interaction)) return
      if (await middleman_select.handle_middleman_partner_select(interaction)) return
      if (await middleman_select.handle_middleman_member_select(interaction)) return
      if (await tempvoice_select.handle_tempvoice_user_select(interaction)) return
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

  // - 按钮路由，按功能分组 - \\
  // - button routing, grouped by feature - \\
  if (interaction.isButton()) {
    try {
      if (await handle_error_log_button(interaction, client)) return

      // - 反垃圾内联处理 - \\
      // - anti spam stuff handled inline - \\
      if (interaction.customId.startsWith("anti_spam_")) {
        await handle_anti_spam_button(interaction, client)
        return
      }

      if (await handle_ticket_button(interaction)) return

      // - 中间人按钮 - \\
      // - middleman buttons - \\
      if (await middleman_buttons.handle_middleman_close(interaction)) return
      if (await middleman_buttons.handle_middleman_close_reason(interaction)) return
      if (await middleman_buttons.handle_middleman_add_member(interaction)) return
      if (await middleman_buttons.handle_middleman_complete(interaction)) return
      if (interaction.customId === "midman_service_close_info") {
        await middleman_buttons.handle_middleman_service_close_info(interaction)
        return
      }
      if (await middleman_buttons.handle_middleman_penjual_self(interaction)) return
      if (await middleman_buttons.handle_middleman_pembeli_self(interaction)) return

      // - 社区/评论按钮 - \\
      // - community/review buttons - \\
      if (interaction.customId === "review_submit") {
        await community_buttons.handle_review_submit(interaction)
        return
      }
      if (interaction.customId === "ask_staff_button") {
        await ask_buttons.handle_ask_staff_button(interaction)
        return
      }
      if (interaction.customId.startsWith("ask_answer_")) {
        await ask_buttons.handle_ask_answer(interaction)
        return
      }
      if (interaction.customId === "close_request_accept") {
        await close_request_buttons.handle_close_request_accept(interaction)
        return
      }
      if (interaction.customId === "close_request_deny") {
        await close_request_buttons.handle_close_request_deny(interaction)
        return
      }
      if (interaction.customId.startsWith("reaction_role_")) {
        await reaction_role_buttons.handle_reaction_role(interaction)
        return
      }

      // - 支付按钮 - \\
      // - payment buttons - \\
      if (interaction.customId.startsWith("payment_approve_")) {
        await payment_buttons.handle_payment_approve(interaction)
        return
      }
      if (interaction.customId.startsWith("payment_reject_")) {
        await payment_buttons.handle_payment_reject(interaction)
        return
      }

      // - 指南按钮 - \\
      // - guide buttons - \\
      if (interaction.customId.startsWith("guide_btn_")) {
        await guide_buttons.handle_guide_button(interaction)
        return
      }

      // - 工作报告按钮 - \\
      // - work report buttons - \\
      if (interaction.customId.startsWith("download_all_staff_report:")) {
        await work_buttons.handle_download_all_staff_report(interaction)
        return
      }

      // - 脚本按钮（付费版） - \\
      // - paid script buttons - \\
      if (interaction.customId === "script_redeem_key") {
        await scripts_buttons.handle_redeem_key(interaction)
        return
      }
      if (interaction.customId === "script_get_script") {
        await scripts_buttons.handle_get_script(interaction)
        return
      }
      if (interaction.customId === "script_mobile_copy") {
        await scripts_buttons.handle_mobile_copy(interaction)
        return
      }
      if (interaction.customId === "script_get_role") {
        await scripts_buttons.handle_get_role(interaction)
        return
      }
      if (interaction.customId === "script_reset_hwid") {
        await scripts_buttons.handle_reset_hwid(interaction)
        return
      }
      if (interaction.customId === "script_get_stats") {
        await scripts_buttons.handle_get_stats(interaction)
        return
      }
      if (interaction.customId === "script_view_leaderboard") {
        await scripts_buttons.handle_view_leaderboard(interaction)
        return
      }
      if (interaction.customId.startsWith("script_update_btn:")) {
        if (await scripts_buttons.handle_script_update_btn(interaction)) return
      }

      // - 脚本按钮（免费版） - \\
      // - free script buttons - \\
      if (interaction.customId === "free_get_script") {
        await free_scripts_buttons.handle_free_get_script(interaction)
        return
      }
      if (interaction.customId === "free_mobile_copy") {
        await free_scripts_buttons.handle_free_mobile_copy(interaction)
        return
      }
      if (interaction.customId === "free_reset_hwid") {
        await free_scripts_buttons.handle_free_reset_hwid(interaction)
        return
      }
      if (interaction.customId === "free_get_stats") {
        await free_scripts_buttons.handle_free_get_stats(interaction)
        return
      }
      if (interaction.customId === "free_leaderboard") {
        await free_scripts_buttons.handle_free_leaderboard(interaction)
        return
      }

      // - 分享设置按钮 - \\
      // - share settings buttons - \\
      if (interaction.customId.startsWith("share_settings_continue:")) {
        await share_settings_buttons.handle_share_settings_continue(interaction)
        return
      }
      if (interaction.customId.startsWith("share_settings_star:")) {
        await share_settings_buttons.handle_give_star(interaction)
        return
      }
      if (
        interaction.customId.startsWith("share_settings_prev:") ||
        interaction.customId.startsWith("share_settings_next:")
      ) {
        await share_settings_buttons.handle_share_settings_pagination(interaction)
        return
      }

      // - 临时语音频道按钮 - \\
      // - tempvoice buttons - \\
      if (interaction.customId === "tempvoice_name") {
        await tempvoice_buttons.handle_tempvoice_name(interaction)
        return
      }
      if (interaction.customId === "tempvoice_limit") {
        await tempvoice_buttons.handle_tempvoice_limit(interaction)
        return
      }
      if (interaction.customId === "tempvoice_privacy") {
        await tempvoice_buttons.handle_tempvoice_privacy(interaction)
        return
      }
      if (interaction.customId === "tempvoice_waitingroom") {
        await tempvoice_buttons.handle_tempvoice_waitingroom(interaction)
        return
      }
      if (interaction.customId === "tempvoice_chat") {
        await tempvoice_buttons.handle_tempvoice_chat(interaction)
        return
      }
      if (interaction.customId === "tempvoice_trust") {
        await tempvoice_buttons.handle_tempvoice_trust(interaction)
        return
      }
      if (interaction.customId === "tempvoice_untrust") {
        await tempvoice_buttons.handle_tempvoice_untrust(interaction)
        return
      }
      if (interaction.customId === "tempvoice_invite") {
        await tempvoice_buttons.handle_tempvoice_invite(interaction)
        return
      }
      if (interaction.customId === "tempvoice_kick") {
        await tempvoice_buttons.handle_tempvoice_kick(interaction)
        return
      }
      if (interaction.customId === "tempvoice_region") {
        await tempvoice_buttons.handle_tempvoice_region(interaction)
        return
      }
      if (interaction.customId === "tempvoice_block") {
        await tempvoice_buttons.handle_tempvoice_block(interaction)
        return
      }
      if (interaction.customId === "tempvoice_unblock") {
        await tempvoice_buttons.handle_tempvoice_unblock(interaction)
        return
      }
      if (interaction.customId === "tempvoice_claim") {
        await tempvoice_buttons.handle_tempvoice_claim(interaction)
        return
      }
      if (interaction.customId === "tempvoice_transfer") {
        await tempvoice_buttons.handle_tempvoice_transfer(interaction)
        return
      }
      if (interaction.customId === "tempvoice_delete") {
        await tempvoice_buttons.handle_tempvoice_delete(interaction)
        return
      }
      if (interaction.customId === "tempvoice_leaderboard") {
        await tempvoice_buttons.handle_tempvoice_leaderboard(interaction)
        return
      }

      // - 提醒器按钮 - \\
      // - reminder buttons - \\
      if (interaction.customId === "reminder_add_new") {
        await reminder_buttons.handle_reminder_add_new(interaction)
        return
      }
      if (interaction.customId === "reminder_list") {
        await reminder_buttons.handle_reminder_list(interaction)
        return
      }
      if (interaction.customId === "reminder_cancel_select") {
        await reminder_buttons.handle_reminder_cancel(interaction)
        return
      }

      // - 请假按钮 - \\
      // - loa buttons - \\
      if (interaction.customId === "loa_request") {
        await loa_buttons.handle_loa_request(interaction)
        return
      }
      if (interaction.customId === "loa_approve") {
        await loa_buttons.handle_loa_approve(interaction)
        return
      }
      if (interaction.customId === "loa_reject") {
        await loa_buttons.handle_loa_reject(interaction)
        return
      }
      if (interaction.customId === "loa_end") {
        await loa_buttons.handle_loa_end(interaction)
        return
      }

      // - 其他工具按钮 - \\
      // - misc utility buttons - \\
      if (interaction.customId.startsWith("booster_claim_")) {
        await booster_buttons.handle(interaction)
        return
      }
      if (interaction.customId.startsWith("quarantine_release:")) {
        await quarantine_buttons.handle_quarantine_release(interaction)
        return
      }
      if (interaction.customId.startsWith("staff_info_")) {
        await staff_info_buttons.handle_staff_info_button(interaction)
        return
      }
      if (
        interaction.customId.startsWith("av_server_") ||
        interaction.customId.startsWith("av_global_")
      ) {
        await av_checker_buttons.handle_av_toggle(interaction)
        return
      }

      // - 音乐控制按钮 - \\
      // - music control buttons - \\
      if (interaction.customId === "music_skip") {
        await music_buttons.handle_music_skip(interaction)
        return
      }
      if (interaction.customId === "music_pause_resume") {
        await music_buttons.handle_music_pause_resume(interaction)
        return
      }
      if (interaction.customId === "music_stop") {
        await music_buttons.handle_music_stop(interaction)
        return
      }
      if (interaction.customId.startsWith("music_queue:")) {
        await music_buttons.handle_music_queue(interaction)
        return
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
      if (await handle_ticket_modal(interaction)) return
      if (await staff_modal.handle(interaction)) return
      if (await tempvoice_modal.handle_tempvoice_modal(interaction)) return
      if (interaction.customId === "review_modal") {
        await community_modal.handle_review_modal(interaction)
        return
      }
      if (interaction.customId.startsWith("edit_rules:")) {
        await server_modal.handle_edit_rules_modal(interaction)
        return
      }
      if (interaction.customId === "ask_staff_modal") {
        await ask_modal.handle_ask_staff_modal(interaction)
        return
      }
      if (await reminder_modal.handle_reminder_add_new_modal(interaction)) return
      if (await loa_modal.handle_loa_request_modal(interaction)) return
      if (await scripts_modal.handle_script_redeem_modal(interaction)) return
      if (await middleman_modal.handle_middleman_ticket_details_modal(interaction)) return
      if (await middleman_modal.handle_middleman_close_reason_modal(interaction)) return
      if (await share_settings_modal.handle_share_settings_modal(interaction)) return
      if (await staff_info_modal.handle_edit_staff_info_modal(interaction)) return
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
        await interaction.followUp({ ...err_message, ephemeral: true})
      } else {
        await interaction.reply({ ...err_message, ephemeral: true})
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
      }), ephemeral: true,
    })
    return
  }

  const ctx = { interaction, client }
  await run_middleware(__command_middleware, ctx, async () => {
    await command.execute(interaction)
  })
}
