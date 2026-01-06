import { NextRequest, NextResponse } from 'next/server'

// - CHECK AUTH STATUS - \\
/**
 * @route GET /api/auth/check
 * @description Check if user is authenticated
 */
export async function GET(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get('discord_user')
    
    if (!discord_user_cookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const user = JSON.parse(discord_user_cookie.value)
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator,
      },
    })
  } catch (error) {
    console.error('[ - AUTH CHECK - ] Error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
