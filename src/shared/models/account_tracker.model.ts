/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - account tracker 数据库模型 - \\
// - account tracker db models - \\

// - 每个 guild 的 tracker 配置（频道 + 消息 ID） - \\
// - per-guild tracker config (channel + message id) - \\
export interface account_tracker_config {
  _id?        : any
  guild_id    : string
  channel_id  : string
  message_id  : string
  created_at  : number
}

// - 每个脚本账户的 farming 状态快照 - \\
// - per-script account farming state snapshot - \\
export interface account_tracker_session {
  _id?             : any
  key_hash         : string
  guild_id         : string
  username         : string
  user_id          : string
  server_code      : string
  status           : string
  elapsed_time     : string
  current_money    : string
  money_received   : string
  total_earnings   : string
  average_earn     : string
  estimated_done   : number
  teleport_needed  : number
  updated_at       : number
}
