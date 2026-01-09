import { db } from "../../shared/utils"

interface AfkData {
  user_id           : string
  reason            : string
  timestamp         : number
  original_nickname : string | null
}

const afk_users = new Map<string, AfkData>()
const COLLECTION = "afk_users"

export async function load_afk_from_db(): Promise<void> {
  try {
    const records = await db.find_many<AfkData>(COLLECTION, {})
    for (const record of records) {
      afk_users.set(record.user_id, record)
    }
    console.log(`[ - AFK - ] Loaded ${records.length} AFK users from database`)
  } catch (error) {
    console.error("[ - AFK - ] Failed to load AFK users:", error)
  }
}

export async function set_afk(user_id: string, reason: string, original_nickname: string | null): Promise<void> {
  const afk_data: AfkData = {
    user_id,
    reason,
    timestamp         : Date.now(),
    original_nickname,
  }
  
  afk_users.set(user_id, afk_data)
  
  try {
    await db.update_one<AfkData>(
      COLLECTION,
      { user_id },
      afk_data,
      true
    )
  } catch (error) {
    console.error("[ - AFK - ] Failed to save AFK to database:", error)
  }
}

export async function remove_afk(user_id: string): Promise<AfkData | null> {
  const data = afk_users.get(user_id)
  if (data) {
    afk_users.delete(user_id)
    
    try {
      await db.delete_one(COLLECTION, { user_id })
    } catch (error) {
      console.error("[ - AFK - ] Failed to delete AFK from database:", error)
    }
    
    return data
  }
  return null
}

export function get_afk(user_id: string): AfkData | null {
  return afk_users.get(user_id) || null
}

export function is_afk(user_id: string): boolean {
  return afk_users.has(user_id)
}
