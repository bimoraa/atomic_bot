import { NextRequest, NextResponse } from 'next/server'
import { encrypt_session } from '@/lib/utils/session'

// - DISCORD OAUTH CALLBACK - \\
/**
 * @route GET /api/auth/discord/callback
 * @description Handle Discord OAuth callback
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code      = searchParams.get('code')
  const return_to = searchParams.get('state') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=no_code`)
  }

  try {
    const client_id     = process.env.DISCORD_CLIENT_ID
    const client_secret = process.env.DISCORD_CLIENT_SECRET
    const redirect_uri  = `${process.env.NEXT_PUBLIC_WEB_URL}/api/auth/discord/callback`

    if (!client_id || !client_secret) {
      console.error('[ - DISCORD AUTH - ] Missing client_id or client_secret — check .env')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=token_failed`)
    }

    // - Exchange code for token - \\
    console.log('[ - DISCORD AUTH - ] redirect_uri:', redirect_uri)
    console.log('[ - DISCORD AUTH - ] client_id:', client_id, '| secret length:', client_secret.length)
    
    // Switch to passing creds in header, sometimes Discord blocks them in body depending on app config
    const basic_auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    
    const token_params = new URLSearchParams({
      grant_type    : 'authorization_code',
      code          : code,
      redirect_uri  : redirect_uri,
    })
    
    const token_response = await fetch('https://discord.com/api/oauth2/token', {
      method  : 'POST',
      headers : { 
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Authorization' : `Basic ${basic_auth}`
      },
      body    : token_params,
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
    const user_session = {
      id            : user_data.id,
      username      : user_data.username,
      avatar        : user_data.avatar,
      discriminator : user_data.discriminator,
    }
    
    const signed_session = await encrypt_session(user_session)
    
    response.cookies.set('discord_user', signed_session, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'lax',
      path     : '/',
      maxAge   : 60 * 60 * 24 * 7, // 7 days
    })

    // - Store access token for server-side guild fetching - \\
    response.cookies.set('discord_access_token', token_data.access_token, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'lax',
      maxAge   : 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('[ - DISCORD AUTH - ] Error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_WEB_URL}/login?error=unknown`)
  }
}
