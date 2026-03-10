/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本面板按钮组件的定义 - \
// - button component definitions for the script panel - \
import { ButtonInteraction, GuildMember } from "discord.js"
import { ButtonHandler }                  from "@shared/types/interaction"
import { component, modal }              from "@shared/utils"
import * as luarmor                      from "@atomic/infrastructure/api/luarmor"
import { is_hwid_enabled }               from "@atomic/modules/setup/commands/hwid_control"
import { get_user_stats }                from "@atomic/modules/whitelister/controller"

const __sp_whitelisted_role_id = "1398313779380617459"
const __sp_buyer_role_id       = "1364930933148352522"

export const button: ButtonHandler = {
  custom_id: /^script_(get_script|reset_hwid|get_role|get_stats|redeem_key)$/,
  async execute(interaction: ButtonInteraction) {
    const action = interaction.customId.replace("script_", "")

    if (action === "redeem_key") {
      const redeem_modal = modal.create_modal(
        "script_redeem_key_modal",
        "Redeem Script Key",
        modal.create_text_input({
          custom_id  : "user_key",
          label      : "Script Key",
          style      : "short",
          placeholder: "Enter your script key here",
          required   : true,
          min_length : 10,
          max_length : 255,
        })
      )
      await interaction.showModal(redeem_modal)
      return
    }

    await interaction.deferReply({ flags: 64 })

    if (action === "get_script") {
      const user_data = await luarmor.get_user_by_discord(interaction.user.id)

      if (!user_data.success || !user_data.data) {
        await interaction.editReply({
          content: "You are not whitelisted. Please contact staff.",
        })
        return
      }

      const loader = luarmor.get_full_loader_script(user_data.data.user_key)

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Your Script",
                "Copy the script below and paste it into your executor.",
                "",
                "```lua",
                loader,
                "```",
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (action === "reset_hwid") {
      const hwid_enabled = await is_hwid_enabled()
      if (!hwid_enabled) {
        await interaction.editReply({
          content: "HWID reset is currently disabled. Please wait for staff to re-enable it.",
        })
        return
      }

      const result = await luarmor.reset_hwid_by_discord(interaction.user.id)

      const message = component.build_message({
        components: [
          component.container({
            accent_color: result.success ? 0x57F287 : 0xED4245,
            components: [
              component.text(
                result.success
                  ? "## HWID Reset Successful\nYour HWID has been reset. You can now use the script on a new device."
                  : `## HWID Reset Failed\n${result.error || "An error occurred. Please try again later."}`
              ),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (action === "get_role") {
      const user_data = await luarmor.get_user_by_discord(interaction.user.id)

      if (!user_data.success || !user_data.data) {
        await interaction.editReply({
          content: "You are not whitelisted. Please contact staff to get whitelisted first.",
        })
        return
      }

      const member = interaction.member as GuildMember

      try {
        await member.roles.add(__sp_whitelisted_role_id)
        await member.roles.add(__sp_buyer_role_id)

        await interaction.editReply({
          content: "Your script roles have been added successfully!",
        })
      } catch {
        await interaction.editReply({
          content: "Failed to add roles. Please contact staff.",
        })
      }
      return
    }

    if (action === "get_stats") {
      const result = await get_user_stats({
        user       : interaction.user,
        client     : interaction.client,
        executor_id: interaction.user.id,
      })

      if (!result.success) {
        await interaction.editReply({
          content: result.error || "Failed to fetch stats. You may not be whitelisted.",
        })
        return
      }

      await interaction.editReply(result.message!)
    }
  },
}
