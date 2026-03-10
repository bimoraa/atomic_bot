/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 临时语音设置 modal 的交互注册和处理 - \
// - registers and handles temp voice settings modal interactions - \
import { ModalSubmitInteraction, GuildMember, VoiceChannel } from "discord.js"
import { ModalHandler }                                      from "@shared/types/interaction"
import * as tempvoice from "@shared/database/services/tempvoice"

export const modal: ModalHandler = {
  custom_id: /^tempvoice_(rename|limit|region)_modal$/,
  async execute(interaction: ModalSubmitInteraction) {
    const action = interaction.customId.replace("tempvoice_", "").replace("_modal", "")

    await interaction.deferReply({ flags: 64 })

    const member  = interaction.member as GuildMember
    const guild   = interaction.guild
    if (!guild) {
      await interaction.editReply({ content: "This can only be used in a server." })
      return
    }

    const channel = await tempvoice.get_user_temp_channel(guild, member.id)
    if (!channel) {
      await interaction.editReply({ content: "You don't have an active temp voice channel." })
      return
    }

    if (action === "rename") {
      const new_name = interaction.fields.getTextInputValue("new_name").trim()
      const success  = await tempvoice.rename_tempvoice_channel(channel, new_name)
      await interaction.editReply({
        content: success
          ? `Channel renamed to **${new_name}**.`
          : "Failed to rename the channel.",
      })
      return
    }

    if (action === "limit") {
      const input = interaction.fields.getTextInputValue("user_limit").trim()
      const limit = parseInt(input, 10)

      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.editReply({ content: "Invalid limit. Enter a number between 0 and 99." })
        return
      }

      const success = await tempvoice.set_user_limit(channel, limit)
      await interaction.editReply({
        content: success
          ? limit === 0
            ? "User limit removed (no limit)."
            : `User limit set to **${limit}**.`
          : "Failed to update user limit.",
      })
      return
    }

    if (action === "region") {
      const region  = interaction.fields.getTextInputValue("region").trim() || null
      const success = await tempvoice.set_region(channel as VoiceChannel, region)
      await interaction.editReply({
        content: success
          ? region
            ? `Voice region set to **${region}**.`
            : "Voice region set to **auto**."
          : "Failed to update voice region.",
      })
    }
  },
}
