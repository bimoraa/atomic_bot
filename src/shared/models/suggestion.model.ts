/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 功能建议数据库模型 - \\
// - feature suggestion db model - \\

export type suggestion_type   = "add_game_support" | "add_new_feature"
export type suggestion_status = "pending" | "approved" | "rejected"
export type vote_source       = "discord" | "web"

export interface suggestion_data {
  id                  : string
  user_id             : string
  guild_id            : string
  suggest_type        : suggestion_type
  game_name           : string | null
  game_id             : string | null
  game_image          : string | null
  feature_description : string
  reason              : string | null
  status              : suggestion_status
  discord_message_id  : string | null
  created_at          : number
}

export interface suggestion_vote_data {
  id            : number
  suggestion_id : string
  user_id       : string
  source        : vote_source
  created_at    : number
}
