import { NextRequest, NextResponse }        from 'next/server'
import { update_application_review }        from '@/lib/database/managers/staff_application_manager'
import { connect }                          from "@/lib/utils/database"

const __bot_url         = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __allowed_role_id = "1346622175985143908"
const __min_position    = 112

async function check_auth(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get('discord_user')
    if (!discord_user_cookie) return null

    const user = JSON.parse(discord_user_cookie.value)
    if (user.id === "1118453649727823974") return user

    const res         = await fetch(`${__bot_url}/api/member/${user.id}`)
    if (!res.ok) return null

    const member_data = await res.json()
    const has_role    = member_data.roles?.some((r: any) => r.id === __allowed_role_id || r.position >= __min_position)
    if (!has_role) return null

    return user
  } catch {
    return null
  }
}

/**
 * @route PATCH /api/recruitment-applications/[uuid]
 * @description Save note + flag on an application. Reviewer identity taken from session cookie.
 * @param req - { note?: string, flag?: 'pending' | 'approved' | 'declined' }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const user = await check_auth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uuid } = await params

  try {
    const body  = await req.json()
    const patch: Record<string, any> = {}

    if (body.note  !== undefined) patch.note        = body.note
    if (body.flag  !== undefined) patch.flag        = body.flag
    patch.reviewed_by  = user.username || user.global_name || user.id
    patch.reviewed_at  = Date.now()

    await connect()
    await update_application_review(uuid, patch)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ - REVIEW PATCH API - ] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
