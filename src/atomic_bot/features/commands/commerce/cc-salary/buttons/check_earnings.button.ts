/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - cc panel「查看收入」按钮 - \\
// - cc panel check earnings button handler - \\

import { ButtonInteraction, GuildMember } from "discord.js"
import { component }                      from "@utils"
import { member_has_role }                from "@utils/discord_api"
import { log_error }                      from "@utils/error_logger"
import { build_earnings_message }         from "@commands/commerce/cc-salary/controller/cc_salary.controller"

const __cc_role_id = "1284060046048886845"

/**
 * @description handles check earnings button from cc panel
 * @param {ButtonInteraction} interaction - discord button interaction
 * @returns {Promise<void>}
 */
export async function handle_cc_check_earnings(interaction: ButtonInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    if (!member_has_role(member, __cc_role_id)) {
      await interaction.reply({
        ...component.build_message({
          components: [component.container({ components: [component.text("You don't have the Content Creator role.")] })],
        }),
        ephemeral: true,
      })
      return
    }

    const guild_id = interaction.guildId!
    const message  = await build_earnings_message(member.id, guild_id)

    await interaction.reply({
      ...message,
      ephemeral: true,
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "CC Check Earnings Button", {
      user_id  : interaction.user.id,
      guild_id : interaction.guildId ?? undefined,
    }).catch(() => {})

    await interaction.reply({
      ...component.build_message({
        components: [component.container({ components: [component.text("An error occurred. Please try again.")] })],
      }),
      ephemeral: true,
    }).catch(() => {})
  }
}
