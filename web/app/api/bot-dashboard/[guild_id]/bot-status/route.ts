import { NextRequest, NextResponse } from 'next/server'
import { verify_manage_guild }       from '@/lib/auth'

// - CHECK IF BOT IS IN GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/bot-status
 * @description Proxies to atomic bot to check guild membership
 * @returns JSON { in_guild: boolean, invite_url: string }
 */
export async function GET(
  req        : NextRequest,
  { params } : { params: Promise<{ guild_id: string }> }
) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const authorized = await verify_manage_guild(access_token, guild_id)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const bot_url    = process.env.NEXT_PUBLIC_BOT_URL ?? 'http://localhost:3456'
  const invite_url =
    `https://discord.com/oauth2/authorize?client_id=1476977037070696612&permissions=4503599694556160&integration_type=0&scope=bot&guild_id=${guild_id}&disable_guild_select=true`

  try {
    const response = await fetch(`${bot_url}/api/guild/${guild_id}/status`, {
      headers : { Authorization: `Bearer ${process.env.BOT_API_SECRET ?? 'dev-secret'}` },
      next    : { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
    }

    const data = await response.json()
    return NextResponse.json({ in_guild: data.in_guild ?? false, invite_url }, { status: 200 })
  } catch (err) {
    console.error('[ - BOT STATUS API - ]', err)
    return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
  }
}
