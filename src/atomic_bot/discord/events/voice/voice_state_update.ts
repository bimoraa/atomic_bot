/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 语音状态变化时触发，用于临时语音频道管理 - \
// - handles voice state update events, used for temp voice management - \
import { Events, VoiceState } from "discord.js"
import { client }             from "@startup/atomic_bot"
import * as tempvoice         from "@services/tempvoice"
import {
  on_voice_join,
  on_voice_leave,
}                             from "@commands/staff-management/staff/controller/staff_voice.controller"

client.on(Events.VoiceStateUpdate, async (old_state: VoiceState, new_state: VoiceState) => {
  try {
    await tempvoice.handle_voice_state_update(old_state, new_state)
  } catch (error) {
    console.error("[tempvoice] Voice state update error:", error)
  }

  // - 跳过机器人 - \\
  // - skip bots - \\
  const member = new_state.member ?? old_state.member
  if (!member || member.user.bot) return

  const user_id  = member.id
  const guild_id = (new_state.guild ?? old_state.guild).id

  const left_channel   = old_state.channelId
  const joined_channel = new_state.channelId

  if (!left_channel && joined_channel) {
    // - 加入语音 - \\
    // - joined voice - \\
    on_voice_join(user_id, guild_id, joined_channel)
  } else if (left_channel && !joined_channel) {
    // - 完全离开语音 - \\
    // - left voice entirely - \\
    await on_voice_leave(user_id, guild_id)
  } else if (left_channel && joined_channel && left_channel !== joined_channel) {
    // - 切换频道：更新内存会话，不写入数据库 - \\
    // - channel switch: update in-memory session, no db write - \\
    on_voice_join(user_id, guild_id, joined_channel)
  }
})
