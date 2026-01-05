import { NextRequest, NextResponse } from 'next/server'

// - DISCORD OAUTH - \\
/**
 * @route GET /api/auth/discord
 * @description Redirect to Discord OAuth
 */
export async function GET(req: NextRequest) {
  const client_id = process.env.DISCORD_CLIENT_ID
  const redirect_uri = `${process.env.NEXT_PUBLIC_WEB_URL}/api/auth/discord/callback`
  
  if (!client_id) {
    return NextResponse.json({ error: 'Discord client ID not configured' }, { status: 500 })
  }

  const discord_auth_url = new URL('https://discord.com/api/oauth2/authorize')
  discord_auth_url.searchParams.set('client_id', client_id)
  discord_auth_url.searchParams.set('redirect_uri', redirect_uri)
  discord_auth_url.searchParams.set('response_type', 'code')
  discord_auth_url.searchParams.set('scope', 'identify guilds')

  return NextResponse.redirect(discord_auth_url.toString())
}
