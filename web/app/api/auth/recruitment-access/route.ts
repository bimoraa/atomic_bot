import { NextRequest, NextResponse } from 'next/server'
import { decrypt_session } from '@/lib/utils/session'

const __bot_url = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __allowed_role_id = "1346622175985143908"
const __min_position = 112 // Position of Recruitment & Division Operations Manager
const __allowed_developer_id = "1118453649727823974"

export async function GET(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get('discord_user')
    if (!discord_user_cookie) {
      return NextResponse.json({ authenticated: false, authorized: false }, { status: 401 })
    }

    const user = await decrypt_session(discord_user_cookie.value)
    if (!user) {
      return NextResponse.json({ authenticated: false, authorized: false }, { status: 401 })
    }

    // Bypass for Developer ID
    if (user.id === __allowed_developer_id) {
      return NextResponse.json({ 
        authenticated: true, 
        authorized: true, 
        user: { id: user.id, username: user.username, avatar: user.avatar } 
      })
    }

    const res = await fetch(`${__bot_url}/api/member/${user.id}`)
    if (!res.ok) {
      return NextResponse.json({ authenticated: true, authorized: false }, { status: 403 })
    }

    const member_data = await res.json()
    // Check if user has the specific role OR any role with a higher position
    const has_role = member_data.roles?.some((r: any) => r.id === __allowed_role_id || r.position >= __min_position)

    if (!has_role) {
      return NextResponse.json({ authenticated: true, authorized: false }, { status: 403 })
    }

    return NextResponse.json({ 
      authenticated: true, 
      authorized: true, 
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      } 
    })
  } catch (error) {
    console.error('[ - RECRUITMENT AUTH CHECK - ] Error:', error)
    return NextResponse.json({ authenticated: false, authorized: false }, { status: 500 })
  }
}

