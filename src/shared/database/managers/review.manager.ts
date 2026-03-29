/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { db } from "../../utils"

interface review_record {
  user_id      : string
  review_text  : string
  rating       : number
  timestamp    : number
  message_id   : string
}

const __collection_reviews   = "reviews"
const __daily_review_limit   = 2

/**
 * @param {string} user_id - user ID
 * @returns {Promise<number>} count of reviews submitted today
 */
export async function get_today_review_count(user_id: string): Promise<number> {
  const today_start = get_day_start_timestamp()

  const reviews = await db.find_many<review_record>(
    __collection_reviews,
    { 
      user_id,
      timestamp: { $gte: today_start }
    }
  )

  return reviews.length
}

/**
 * @param {string} user_id - user ID
 * @returns {Promise<boolean>} whether user can submit more reviews today
 */
export async function can_submit_review(user_id: string): Promise<boolean> {
  const count = await get_today_review_count(user_id)
  return count < __daily_review_limit
}

/**
 * @param {string} user_id - user ID
 * @param {string} review_text - review content
 * @param {number} rating - rating (1-5)
 * @param {number} timestamp - unix timestamp
 * @param {string} message_id - discord message ID
 * @returns {Promise<boolean>} success status
 */
export async function save_review(
  user_id     : string,
  review_text : string,
  rating      : number,
  timestamp   : number,
  message_id  : string
): Promise<boolean> {
  try {
    await db.insert_one(__collection_reviews, {
      user_id,
      review_text,
      rating,
      timestamp,
      message_id,
    })

    return true
  } catch (err) {
    console.error("[ - SAVE REVIEW ERROR - ]", err)
    return false
  }
}

/**
 * @param {string} user_id - user ID
 * @returns {Promise<number>} remaining reviews for today
 */
export async function get_remaining_reviews(user_id: string): Promise<number> {
  const count = await get_today_review_count(user_id)
  return Math.max(0, __daily_review_limit - count)
}

/**
 * @returns {number} unix timestamp for start of today (00:00:00 UTC)
 */
function get_day_start_timestamp(): number {
  const now   = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  return Math.floor(start.getTime() / 1000)
}
