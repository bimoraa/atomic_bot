import { NextRequest, NextResponse } from 'next/server'
import { get_all_applications }      from '@/lib/database/managers/staff_application_manager'
import { connect }                   from "@/lib/utils/database"
import { check_auth }                from '@/lib/utils/auth'

export async function GET(req: NextRequest) {
  const user = await check_auth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connect()
    const applications = await get_all_applications()
    return NextResponse.json(applications)
  } catch (error) {
    console.error('[ - RECRUITMENT APPS API - ] Error fetching applications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
