import { get_pool } from "@/lib/utils/database"
import { randomUUID } from "crypto"

export interface staff_info_section {
  id        : string
  tab_id    : string
  title     : string
  content   : string
  position  : number
  created_at: number
  updated_at: number
}

export interface staff_info_tab {
  id        : string
  title     : string
  position  : number
  sections  : staff_info_section[]
  created_at: number
  updated_at: number
}

/**
 * @description Get all tabs with their sections ordered by position
 * @returns {Promise<staff_info_tab[]>} All tabs with nested sections
 */
export async function get_all_tabs(): Promise<staff_info_tab[]> {
  const pool   = get_pool()
  const client = await pool.connect()

  try {
    const tabs_result = await client.query<Omit<staff_info_tab, "sections">>(`
      SELECT id, title, position, created_at, updated_at
      FROM staff_information_tabs
      ORDER BY position ASC
    `)

    const sections_result = await client.query<staff_info_section>(`
      SELECT id, tab_id, title, content, position, created_at, updated_at
      FROM staff_information_sections
      ORDER BY tab_id, position ASC
    `)

    const sections_by_tab = new Map<string, staff_info_section[]>()
    for (const section of sections_result.rows) {
      const existing = sections_by_tab.get(section.tab_id) ?? []
      existing.push(section)
      sections_by_tab.set(section.tab_id, existing)
    }

    return tabs_result.rows.map(tab => ({
      ...tab,
      created_at: Number(tab.created_at),
      updated_at: Number(tab.updated_at),
      sections  : (sections_by_tab.get(tab.id) ?? []).map(s => ({
        ...s,
        created_at: Number(s.created_at),
        updated_at: Number(s.updated_at),
      })),
    }))
  } finally {
    client.release()
  }
}

export interface save_tabs_payload {
  tabs: {
    id      ?: string
    title   : string
    position: number
    sections: {
      id      ?: string
      title   : string
      content : string
      position: number
    }[]
  }[]
}

/**
 * @description Replace all tabs and sections atomically (full replace strategy)
 * @param {save_tabs_payload} payload - New tabs and sections data
 * @returns {Promise<void>}
 */
export async function save_all_tabs(payload: save_tabs_payload): Promise<void> {
  const pool   = get_pool()
  const client = await pool.connect()
  const now    = Date.now()

  try {
    await client.query("BEGIN")

    // - 先删所有 section，再删所有 tab（利用 cascade），然后重新插入 - \\
    // - delete all sections then tabs (cascade), then re-insert everything - \\
    await client.query("DELETE FROM staff_information_sections")
    await client.query("DELETE FROM staff_information_tabs")

    for (const tab of payload.tabs) {
      const tab_id = tab.id ?? randomUUID()

      await client.query(`
        INSERT INTO staff_information_tabs (id, title, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [tab_id, tab.title, tab.position, now, now])

      for (const section of tab.sections) {
        const section_id = section.id ?? randomUUID()

        await client.query(`
          INSERT INTO staff_information_sections (id, tab_id, title, content, position, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [section_id, tab_id, section.title, section.content, section.position, now, now])
      }
    }

    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
