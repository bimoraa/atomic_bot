/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import * as db             from "@shared/utils/database"
import { delete_one }      from "@shared/utils/database"

export interface staff_application {
  uuid                 ?: string
  discord_id           : string
  full_name            : string
  dob                  : string
  discord_username     : string
  languages            : string[]
  past_cs_experience   : string
  past_staff_experience: string
  active_other_hub     : string
  handle_upset_users   : string
  handle_uncertainty   : string
  why_join             : string
  good_fit             : string
  other_experience     : string
  unsure_case          : string
  working_mic          : string
  understand_abuse     : string
  additional_questions : string
  created_at           : number
}

const __collection = "staff_applications"

/**
 * @description check if a user has already applied for staff
 * @param discord_id The user's Discord ID
 * @returns boolean True if applied, false otherwise
 */
export async function has_user_applied(discord_id: string): Promise<boolean> {
  const application = await db.find_one<staff_application>(__collection, { discord_id })
  return !!application
}

/**
 * @description submit a new staff application
 * @param data The staff application data
 * @returns "ok" on success, "duplicate" if already applied
 */
export async function submit_application(data: staff_application): Promise<"ok"> {
  // - 口述：先删除旧记录，再插入新记录 - \\
  // - upsert: remove any stale record first, then insert fresh - \\
  await delete_one(__collection, { discord_id: data.discord_id }).catch(() => {})
  await db.insert_one(__collection, data)

  return "ok"
}

/**
 * @description get a user's staff application by discord_id
 * @param discord_id The user's Discord ID
 * @returns The staff application or null
 */
export async function get_application(discord_id: string): Promise<staff_application | null> {
  return await db.find_one<staff_application>(__collection, { discord_id })
}

export async function get_application_by_uuid(uuid: string): Promise<staff_application | null> {
  return await db.find_one<staff_application>(__collection, { uuid })
}

export async function delete_application(discord_id: string): Promise<boolean> {
  return await delete_one(__collection, { discord_id })
}

export async function get_all_applications(): Promise<staff_application[]> {
  return await db.find_many<staff_application>(__collection, {})
}
