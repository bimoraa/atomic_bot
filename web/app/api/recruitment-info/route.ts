import { NextResponse }              from 'next/server'
import { get_recruitment_settings }  from '@/lib/database/managers/recruitment_settings_manager'
import { connect }                   from "@/lib/utils/database"

/**
 * @route GET /api/recruitment-info
 * @description Public endpoint returning minimal recruitment info (wave number, open status)
 * @returns { wave_number: number, is_open: boolean }
 */
export async function GET() {
  try {
    await connect()
    const settings = await get_recruitment_settings()
    return NextResponse.json({
      wave_number: settings.wave_number,
      is_open    : settings.is_open,
    })
  } catch (error) {
    console.error('[ - RECRUITMENT INFO API - ] Error:', error)
    return NextResponse.json({ wave_number: 1, is_open: false })
  }
}
