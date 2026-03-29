import * as db from "@/lib/utils/database"

export interface recruitment_settings {
  id: string
  is_open: boolean
  wave_number: number
  open_date: number | null
  close_date: number | null
  updated_at: number
}

const __collection = "recruitment_settings"

export async function get_recruitment_settings(): Promise<recruitment_settings> {
  const settings = await db.find_one<recruitment_settings>(__collection, { id: "main" })
  
  if (!settings) {
    const default_settings: recruitment_settings = {
      id: "main",
      is_open: false,
      wave_number: 1,
      open_date: null,
      close_date: null,
      updated_at: Date.now()
    }
    await db.insert_one(__collection, default_settings)
    return default_settings
  }
  
  return settings
}

export async function update_recruitment_settings(data: Partial<recruitment_settings>): Promise<boolean> {
  data.updated_at = Date.now()
  await db.update_one(__collection, { id: "main" }, data)
  return true
}
