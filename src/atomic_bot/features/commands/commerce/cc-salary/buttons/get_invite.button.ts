/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - cc panel「获取邀请链接」按钮 - \\
// - cc panel get invite link button handler - \\

import { ButtonInteraction, GuildMember } from "discord.js"
import { member_has_role }                from "@utils/discord_api"
import { log_error }                      from "@utils/error_logger"
import { build_invite_link_message }      from "@commands/commerce/cc-salary/controller/cc_salary.controller"

const __cc_role_id = "1284060046048886845"

/**
 * @description handles get invite link button from cc panel
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_cc_get_invite(interaction: ButtonInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    if (!member_has_role(member, __cc_role_id)) {
      await interaction.reply({
        content  : "You don't have the Content Creator role.",
        flags    : 64,
      })
      return
    }

    const message = await build_invite_link_message(member)

    await interaction.reply({
      ...message,
      flags: 64,
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "CC Get Invite Button", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId ?? undefined,
    }).catch(() => {})
  }
}
