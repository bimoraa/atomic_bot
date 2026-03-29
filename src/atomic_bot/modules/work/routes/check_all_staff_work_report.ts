/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /work check-all-staff-report，查看全员工作报告 - \
// - /work check-all-staff-report command, shows the full staff work report - \
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { component } from "@shared/utils"
import type { Command } from "@shared/types/command"

const check_all_staff_work_report: Command = {
  data: new SlashCommandBuilder()
    .setName("check-all-staff-work-report")
    .setDescription("Check all staff work reports by year and week"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: 64 })

    const year_options = [
      { label: "2025", value: "2025" },
      { label: "2026", value: "2026" },
    ]

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("**SELECT YEAR**"),
            component.text("Choose the year to view work reports"),
          ],
        }),
        component.container({
          components: [
            component.select_menu(
              "all_staff_work_year_select",
              "Select year",
              year_options
            ),
          ],
        }),
      ],
    })

    await interaction.editReply(message)
  },
}

export default check_all_staff_work_report
