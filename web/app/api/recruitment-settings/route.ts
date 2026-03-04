import { NextRequest, NextResponse } from 'next/server'
import { get_recruitment_settings, update_recruitment_settings } from '@/lib/database/managers/recruitment_settings_manager'
import { connect } from "@/lib/utils/database"

const __bot_url = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __allowed_role_id = "1346622175985143908"
const __min_position = 112

async function check_auth(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get('discord_user')
    if (!discord_user_cookie) return null
    
    const user = JSON.parse(discord_user_cookie.value)
    
    if (user.id === "1118453649727823974") return user
    
    const res = await fetch(`${__bot_url}/api/member/${user.id}`)
    if (!res.ok) return null
    
    const member_data = await res.json()
    const has_role = member_data.roles?.some((r: any) => r.id === __allowed_role_id || r.position >= __min_position)
    
    if (!has_role) return null
    
    return user
  } catch (error) {
    return null
  }
}

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
    const body = await req.json()
    
    const update_data: any = {}
    if (body.is_open !== undefined) update_data.is_open = body.is_open
    if (body.wave_number !== undefined) update_data.wave_number = body.wave_number
    if (body.open_date !== undefined) update_data.open_date = body.open_date
    if (body.close_date !== undefined) update_data.close_date = body.close_date

    await connect()
    await update_recruitment_settings(update_data)
    
    const new_settings = await get_recruitment_settings()
    return NextResponse.json(new_settings)
  } catch (error) {
    console.error('[ - RECRUITMENT SETTINGS API - ] Error updating settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
