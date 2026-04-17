/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 按钮前缀匹配分发表 — customId 前缀映射到处理器 - \\
// - prefix-match button dispatch table — maps customId prefix to handler - \\
import { ButtonInteraction, Client }   from "discord.js"
import { component }                   from "@utils"
import { log_error }                   from "@utils/error_logger"
import { handle_anti_nuke_undo }       from "@commands/moderation/anti-nuke/buttons/anti_nuke.button"
import { get_button_module }           from "@discord/interaction-registry"
import { ButtonHandler }               from "@discord/dispatchers/button.exact"

export type ButtonPrefixEntry = readonly [prefix: string, handler: ButtonHandler]

// - 加载所需按钮模块 - \\
// - load required button modules - \\
const ask_buttons            = get_button_module("ask")
const av_checker_buttons     = get_button_module("av-checker")
const booster_buttons        = get_button_module("booster")
const guide_buttons          = get_button_module("guide")
const music_buttons          = get_button_module("music")
const payment_buttons        = get_button_module("payment")
const quarantine_buttons     = get_button_module("quarantine")
const reaction_role_buttons  = get_button_module("reaction-roles")
const scripts_buttons        = get_button_module("scripts")
const share_settings_buttons = get_button_module("share-settings")
const staff_info_buttons     = get_button_module("staff-info")
const suggest_feature_buttons = get_button_module("suggest-feature")
const work_buttons           = get_button_module("work")

/**
 * @description handles anti-spam action buttons (untimeout, ban, show flagged info)
 * @param {ButtonInteraction} interaction - the button interaction
 * @param {Client} client - discord client for error logging
 * @returns {Promise<void>}
 */
async function handle_anti_spam_button(interaction: ButtonInteraction, client: Client): Promise<void> {
  const reply = (text: string | string[]) => interaction.reply({
    ...component.build_message({
      components: [component.container({ components: [component.text(text)] })],
    }),
    ephemeral: true,
  })

  try {
    const parts      = interaction.customId.split(":")
    const action     = parts[0]
    const target_id  = parts[1]
    const message_id = parts[2]

    if (!target_id)         { await reply("Target not found"); return }
    if (!interaction.guild) { await reply("Guild not found");  return }

    const guild = interaction.guild

    if (action === "anti_spam_untimeout") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (!member) { await reply("User not found in guild"); return }
      await member.timeout(null, "Anti-Spam untimeout")
      await reply("User un-timed out")
      return
    }

    if (action === "anti_spam_ban") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (member) {
        await member.ban({ reason: "Anti-Spam ban" })
      } else {
        await guild.bans.create(target_id, { reason: "Anti-Spam ban" }).catch(async () => {
          await reply("Failed to ban user")
        })
      }
      if (!interaction.replied) await reply("User banned")
      return
    }

    if (action === "anti_spam_download") {
      await reply([`Target: <@${target_id}>`, `Message ID: ${message_id || "N/A"}`])
      return
    }

    await reply("Unknown action")
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
          components: [component.container({ components: [component.text("Error handling action")] })],
        }),
        ephemeral: true,
      }).catch(() => {})
    }
  }
}

/**
 * @description prefix-match array for button interactions — checked via startsWith
 * @returns {ButtonPrefixEntry[]}
 */
export const button_prefix: ButtonPrefixEntry[] = [
  ["anti_spam_",                 (i, c) => handle_anti_spam_button(i, c)],
  ["anti_nuke_undo:",            (i)    => handle_anti_nuke_undo(i)],
  ["ask_answer_",                (i)    => ask_buttons.handle_ask_answer(i)],
  ["av_server_",                 (i)    => av_checker_buttons.handle_av_toggle(i)],
  ["av_global_",                 (i)    => av_checker_buttons.handle_av_toggle(i)],
  ["booster_claim_",             (i)    => booster_buttons.handle(i)],
  ["download_all_staff_report:", (i)    => work_buttons.handle_download_all_staff_report(i)],
  ["guide_btn_",                 (i)    => guide_buttons.handle_guide_button(i)],
  ["music_queue:",               (i)    => music_buttons.handle_music_queue(i)],
  ["payment_approve_",           (i)    => payment_buttons.handle_payment_approve(i)],
  ["payment_reject_",            (i)    => payment_buttons.handle_payment_reject(i)],
  ["quarantine_release:",        (i)    => quarantine_buttons.handle_quarantine_release(i)],
  ["reaction_role_",             (i)    => reaction_role_buttons.handle_reaction_role(i)],
  ["script_update_btn:",         (i)    => scripts_buttons.handle_script_update_btn(i)],
  ["share_settings_continue:",   (i)    => share_settings_buttons.handle_share_settings_continue(i)],
  ["share_settings_next:",       (i)    => share_settings_buttons.handle_share_settings_pagination(i)],
  ["share_settings_prev:",       (i)    => share_settings_buttons.handle_share_settings_pagination(i)],
  ["share_settings_star:",       (i)    => share_settings_buttons.handle_give_star(i)],
  ["staff_info_",                (i)    => staff_info_buttons.handle_staff_info_button(i)],
  ["suggest_upvote:",            (i)    => suggest_feature_buttons.handle_suggest_upvote(i)],
]
