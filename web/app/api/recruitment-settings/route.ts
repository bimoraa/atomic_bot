import { NextRequest, NextResponse }                                              from 'next/server'
import { get_recruitment_settings, update_recruitment_settings }                  from '@/lib/database/managers/recruitment_settings_manager'
import { connect }                                                                from "@/lib/utils/database"
import { check_auth }                                                             from '@/lib/utils/auth'

export async function GET(req: NextRequest) {
  const user = await check_auth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connect()
    const settings = await get_recruitment_settings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('[ - RECRUITMENT SETTINGS API - ] Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await check_auth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body        = await req.json()
    const update_data: Record<string, any> = {}

    if (body.is_open !== undefined) {
      if (typeof body.is_open !== 'boolean') return NextResponse.json({ error: 'is_open must be a boolean' }, { status: 400 })
      update_data.is_open = body.is_open
    }
    if (body.wave_number !== undefined) {
      const wn = Number(body.wave_number)
      if (!Number.isInteger(wn) || wn < 1) return NextResponse.json({ error: 'wave_number must be a positive integer' }, { status: 400 })
      update_data.wave_number = wn
    }
    if (body.open_date  !== undefined) update_data.open_date  = body.open_date
    if (body.close_date !== undefined) update_data.close_date = body.close_date

    if (Object.keys(update_data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await connect()
    await update_recruitment_settings(update_data)
    
    const new_settings = await get_recruitment_settings()
    return NextResponse.json(new_settings)
  } catch (error) {
    console.error('[ - RECRUITMENT SETTINGS API - ] Error updating settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
