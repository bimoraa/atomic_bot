/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 功能建议数据库管理器 - \\
// - feature suggestion database manager - \\
import { db }                  from "@utils"
import type { suggestion_data, suggestion_vote_data } from "@models/suggestion.model"

const __collection_suggestions = "feature_suggestions"
const __collection_votes       = "feature_suggestion_votes"

/**
 * @description create a new feature suggestion
 * @param data - suggestion data to insert
 * @returns inserted id
 */
export async function create_suggestion(data: suggestion_data): Promise<string> {
  return await db.insert_one(__collection_suggestions, data)
}

/**
 * @description find a suggestion by id
 * @param id - suggestion uuid
 * @returns suggestion data or null
 */
export async function find_suggestion(id: string): Promise<suggestion_data | null> {
  return await db.find_one<suggestion_data>(__collection_suggestions, { id })
}

/**
 * @description find all suggestions for a guild
 * @param guild_id - discord guild id
 * @returns array of suggestions
 */
export async function find_suggestions_by_guild(guild_id: string): Promise<suggestion_data[]> {
  return await db.find_many<suggestion_data>(__collection_suggestions, { guild_id })
}

/**
 * @description find all suggestions
 * @returns array of all suggestions
 */
export async function find_all_suggestions(): Promise<suggestion_data[]> {
  return await db.find_many<suggestion_data>(__collection_suggestions, {})
}

/**
 * @description update suggestion fields
 * @param id - suggestion uuid
 * @param updates - partial fields to update
 * @returns void
 */
export async function update_suggestion(id: string, updates: Partial<suggestion_data>): Promise<void> {
  await db.update_one(__collection_suggestions, { id }, { $set: updates })
}

/**
 * @description add or update a vote for a suggestion
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @param source - vote source (discord or web)
 * @returns void
 */
export async function upsert_vote(suggestion_id: string, user_id: string, source: string): Promise<void> {
  const existing = await db.find_one<suggestion_vote_data>(__collection_votes, { suggestion_id, user_id })

  if (existing) return

  await db.insert_one(__collection_votes, {
    suggestion_id,
    user_id,
    source,
    created_at: Math.floor(Date.now() / 1000),
  })
}

/**
 * @description remove a vote for a suggestion
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @returns void
 */
export async function remove_vote(suggestion_id: string, user_id: string): Promise<void> {
  await db.delete_one(__collection_votes, { suggestion_id, user_id })
}

/**
 * @description check if a user has voted on a suggestion
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @returns boolean
 */
export async function has_voted(suggestion_id: string, user_id: string): Promise<boolean> {
  const vote = await db.find_one<suggestion_vote_data>(__collection_votes, { suggestion_id, user_id })
  return !!vote
}

/**
 * @description get total upvote count for a suggestion
 * @param suggestion_id - suggestion uuid
 * @returns vote count
 */
export async function get_vote_count(suggestion_id: string): Promise<number> {
  const votes = await db.find_many<suggestion_vote_data>(__collection_votes, { suggestion_id })
  return votes.length
}

/**
 * @description get all voters for a suggestion
 * @param suggestion_id - suggestion uuid
 * @returns array of vote records
 */
export async function get_voters(suggestion_id: string): Promise<suggestion_vote_data[]> {
  return await db.find_many<suggestion_vote_data>(__collection_votes, { suggestion_id })
}
