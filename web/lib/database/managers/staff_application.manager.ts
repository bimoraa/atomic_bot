import * as db             from "@/lib/utils/database"
import { delete_one }      from "@/lib/utils/database"

export interface staff_application {
  uuid                 ?: string
  discord_id           : string
  full_name            : string
  dob                  : string
  discord_username     : string
  discord_avatar       ?: string
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
  note                ?: string
  flag                ?: 'pending' | 'approved' | 'declined'
  reviewed_by         ?: string
  reviewed_at         ?: number
}

const __collection = "staff_applications"

/**
 * @description Check if a user has already applied for staff and return their UUID if they have
 * @param discord_id The user's Discord ID
 * @returns string UUID if applied, null otherwise
 */
export async function get_user_application_uuid(discord_id: string): Promise<string | null> {
  const application = await db.find_one<staff_application>(__collection, { discord_id })
  return application?.uuid || null
}

/**
 * @description Check if a user has already applied for staff
 * @param discord_id The user's Discord ID
 * @returns boolean True if applied, false otherwise
 */
export async function has_user_applied(discord_id: string): Promise<boolean> {
  return !!(await get_user_application_uuid(discord_id))
}

/**
 * @description Submit a new staff application
 * @param data The staff application data
 * @returns "ok" on success, "duplicate" if already applied
 */
export async function submit_application(data: staff_application): Promise<"ok"> {
  // - UPSERT: remove any stale record first, then insert fresh - \\
  await delete_one(__collection, { discord_id: data.discord_id }).catch(() => {})
  await db.insert_one(__collection, data)

  return "ok"
}

/**
 * @description Get a user's staff application by discord_id
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

/**
 * @description Delete a staff application by uuid
 * @param uuid The application UUID
 * @returns boolean
 */
export async function delete_application_by_uuid(uuid: string): Promise<boolean> {
  return await delete_one(__collection, { uuid })
}

export async function get_all_applications(): Promise<staff_application[]> {
  return await db.find_many<staff_application>(__collection, {})
}

/**
 * @description Update review fields (note, flag, reviewer) on an application by uuid
 * @param uuid The application UUID
 * @param data Partial review data to update
 * @returns boolean
 */
export async function update_application_review(
  uuid       : string,
  data       : { note?: string; flag?: staff_application['flag']; reviewed_by?: string; reviewed_at?: number }
): Promise<boolean> {
  await db.update_one(__collection, { uuid }, data)
  return true
}
