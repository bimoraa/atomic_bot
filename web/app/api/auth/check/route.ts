import { NextRequest, NextResponse } from 'next/server'
import { decrypt_session } from '@/lib/utils/session'

// - CHECK AUTH STATUS - \\
/**
 * @route GET /api/auth/check
 * @description Check if user is authenticated via session cookie
 */
export async function GET(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get('discord_user')
    
    if (!discord_user_cookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const user = await decrypt_session(discord_user_cookie.value)
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user,
    })
  } catch (error) {
    console.error('[ - AUTH CHECK - ] Error:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}
