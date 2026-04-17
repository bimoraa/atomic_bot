/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /cc-salary 斜杠命令，管理 content creator 薪资 - \\
// - /cc-salary slash command, manages content creator salary - \\

import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Command }                                                                             from "@shared/types/command"
import { component }                                                                           from "@utils"
import { log_error }                                                                           from "@utils/error_logger"
import { member_has_role }                                                                     from "@utils/discord_api"
import * as cc_salary_manager                                                                  from "@managers/cc_salary.manager"
import {
  build_manager_check_message,
  build_salary_log_message,
  build_leaderboard_message,
}                                                                                              from "@commands/commerce/cc-salary/controller/cc_salary.controller"

const __manager_role_ids = [
  "1316021423206039596",
  "1316022809868107827",
  "1346622175985143908",
  "1273229155151904852",
]

/**
 * @description check if member is a manager
 * @param {GuildMember} member - guild member
 * @returns {boolean}
 */
function is_manager(member: GuildMember): boolean {
  return __manager_role_ids.some(role_id => member_has_role(member, role_id))
    || member.permissions.has(PermissionFlagsBits.Administrator)
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cc-salary")
    .setDescription("Manage Content Creator salary")
    .addSubcommand(sub =>
      sub
        .setName("check")
        .setDescription("Check a CC's salary balance")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Content Creator to check").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Manually add salary to a CC")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Content Creator").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("amount").setDescription("Amount in Rupiah").setRequired(true).setMinValue(1)
        )
        .addStringOption(opt =>
          opt.setName("note").setDescription("Reason for adding").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset a CC's salary balance to 0")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Content Creator to reset").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("withdraw")
        .setDescription("Process salary withdrawal for a CC")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Content Creator").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("amount").setDescription("Withdraw amount in Rupiah").setRequired(true).setMinValue(1)
        )
        .addStringOption(opt =>
          opt.setName("note").setDescription("Withdrawal note").setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("log")
        .setDescription("View salary log history for a CC")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Content Creator").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("leaderboard")
        .setDescription("View CC salary leaderboard")
    ) as SlashCommandBuilder,

  /**
   * @description execute cc-salary subcommands
   * @param {ChatInputCommandInteraction} interaction - discord slash interaction
   * @returns {Promise<void>}
   */
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply({ flags: 64 })

    try {
      const member = interaction.member as GuildMember

      if (!is_manager(member)) {
        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("ED4245"),
                components: [
                  component.text("## Access Denied\nYou need a manager role to use this command."),
                ],
              }),
            ],
          })
        )
        return
      }

      const guild_id   = interaction.guildId!
      const subcommand = interaction.options.getSubcommand()

      // !!! check !!! \\
      if (subcommand === "check") {
        const target = interaction.options.getUser("user", true)
        const message = await build_manager_check_message(target.id, guild_id)
        await interaction.editReply(message)
        return
      }

      // !!! add !!! \\
      if (subcommand === "add") {
        const target = interaction.options.getUser("user", true)
        const amount = interaction.options.getInteger("amount", true)
        const note   = interaction.options.getString("note", true)

        await cc_salary_manager.add_manual(target.id, guild_id, amount, interaction.user.id, note)

        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("57F287"),
                components: [
                  component.text([
                    `## Salary Added`,
                    `- CC: <@${target.id}>`,
                    `- Amount: **Rp ${amount.toLocaleString("id-ID")}**`,
                    `- Note: ${note}`,
                    `- Added by: <@${interaction.user.id}>`,
                  ]),
                ],
              }),
            ],
          })
        )
        return
      }

      // !!! reset !!! \\
      if (subcommand === "reset") {
        const target       = interaction.options.getUser("user", true)
        const prev_balance = await cc_salary_manager.reset_salary(target.id, guild_id, interaction.user.id)

        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("E67E22"),
                components: [
                  component.text([
                    `## Salary Reset`,
                    `- CC: <@${target.id}>`,
                    `- Previous Balance: **Rp ${prev_balance.toLocaleString("id-ID")}**`,
                    `- New Balance: **Rp 0**`,
                    `- Reset by: <@${interaction.user.id}>`,
                  ]),
                ],
              }),
            ],
          })
        )
        return
      }

      // !!! withdraw !!! \\
      if (subcommand === "withdraw") {
        const target = interaction.options.getUser("user", true)
        const amount = interaction.options.getInteger("amount", true)
        const note   = interaction.options.getString("note", false) ?? "Salary withdrawal"

        const success = await cc_salary_manager.withdraw_salary(target.id, guild_id, amount, interaction.user.id, note)

        if (!success) {
          await interaction.editReply(
            component.build_message({
              components: [
                component.container({
                  accent_color: component.from_hex("ED4245"),
                  components: [
                    component.text([
                      `## Withdrawal Failed`,
                      `- CC: <@${target.id}>`,
                      `- Requested: **Rp ${amount.toLocaleString("id-ID")}**`,
                      `- Reason: Insufficient balance or no salary record found.`,
                    ]),
                  ],
                }),
              ],
            })
          )
          return
        }

        await interaction.editReply(
          component.build_message({
            components: [
              component.container({
                accent_color: component.from_hex("57F287"),
                components: [
                  component.text([
                    `## Withdrawal Processed`,
                    `- CC: <@${target.id}>`,
                    `- Amount: **Rp ${amount.toLocaleString("id-ID")}**`,
                    `- Note: ${note}`,
                    `- Processed by: <@${interaction.user.id}>`,
                  ]),
                ],
              }),
            ],
          })
        )
        return
      }

      // !!! log !!! \\
      if (subcommand === "log") {
        const target  = interaction.options.getUser("user", true)
        const message = await build_salary_log_message(target.id, guild_id)
        await interaction.editReply(message)
        return
      }

      // !!! leaderboard !!! \\
      if (subcommand === "leaderboard") {
        const message = await build_leaderboard_message(guild_id)
        await interaction.editReply(message)
        return
      }
    } catch (err) {
      await log_error(interaction.client, err as Error, "CC Salary Command", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId ?? undefined,
      }).catch(() => {})
    }
  },
}
