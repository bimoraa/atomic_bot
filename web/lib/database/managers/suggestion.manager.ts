import * as db from "@/lib/utils/database"

export type suggestion_type   = "add_game_support" | "add_new_feature"
export type suggestion_status = "pending" | "approved" | "rejected"

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
  source        : string
  created_at    : number
}

const __collection_suggestions = "feature_suggestions"
const __collection_votes       = "feature_suggestion_votes"

/**
 * @description find a suggestion by id
 * @param id - suggestion uuid
 * @returns suggestion data or null
 */
export async function find_suggestion(id: string): Promise<suggestion_data | null> {
  return await db.find_one<suggestion_data>(__collection_suggestions, { id })
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
 * @description add a vote for a suggestion (idempotent per user)
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @param source - vote source
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
 * @description remove a vote
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @returns void
 */
export async function remove_vote(suggestion_id: string, user_id: string): Promise<void> {
  await db.delete_one(__collection_votes, { suggestion_id, user_id })
}

/**
 * @description check if user already voted
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @returns boolean
 */
export async function has_voted(suggestion_id: string, user_id: string): Promise<boolean> {
  const vote = await db.find_one<suggestion_vote_data>(__collection_votes, { suggestion_id, user_id })
  return !!vote
}

/**
 * @description get vote count for a suggestion
 * @param suggestion_id - suggestion uuid
 * @returns number
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
