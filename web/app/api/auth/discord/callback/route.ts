import { NextRequest, NextResponse } from 'next/server'

// - DISCORD OAUTH CALLBACK - \\
/**
 * @route GET /api/auth/discord/callback
 * @description Handle Discord OAuth callback
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const return_to = searchParams.get('state') || '/transcript'

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=no_code`)
  }

  try {
    const client_id = process.env.DISCORD_CLIENT_ID
    const client_secret = process.env.DISCORD_CLIENT_SECRET
    const redirect_uri = `${process.env.NEXT_PUBLIC_WEB_URL}/api/auth/discord/callback`

    // - Exchange code for token - \\
    const token_response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: client_id!,
        client_secret: client_secret!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
    })

    if (!token_response.ok) {
      console.error('[ - DISCORD AUTH - ] Token exchange failed:', await token_response.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=token_failed`)
    }

    const token_data = await token_response.json()

    // - Get user info - \\
    const user_response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${token_data.access_token}`,
      },
    })

    if (!user_response.ok) {
      console.error('[ - DISCORD AUTH - ] User fetch failed')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=user_failed`)
    }

    const user_data = await user_response.json()

    // - Set session cookie - \\
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}${return_to}`)
    response.cookies.set('discord_user', JSON.stringify({
      id: user_data.id,
      username: user_data.username,
      avatar: user_data.avatar,
      discriminator: user_data.discriminator,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('[ - DISCORD AUTH - ] Error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=unknown`)
  }
}
