import { NextRequest, NextResponse } from 'next/server'
import { verify_manage_guild }       from '@/lib/auth'

const __DISCORD_API = 'https://discord.com/api/v10'

// - CHECK IF BYPASS BOT IS IN GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/bot-status
 * @description Checks if the bypass bot is in the guild via Discord REST API
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

  const invite_url =
      `https://discord.com/oauth2/authorize?client_id=1476977037070696612&permissions=4503599694556160&integration_type=0&scope=bot&guild_id=${guild_id}&disable_guild_select=true`

  const bot_token = process.env.BYPASS_DISCORD_TOKEN
  if (!bot_token) {
    console.error('[ - BOT STATUS API - ] BYPASS_DISCORD_TOKEN not set')
    return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
  }

  try {
    // - FETCH GUILD VIA BOT TOKEN: 200 = bot is member, 403/404 = not in guild - \\
    const response = await fetch(`${__DISCORD_API}/guilds/${guild_id}?with_counts=true`, {
      headers : { Authorization: `Bot ${bot_token}` },
      next    : { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
    }

    const data = await response.json()
    const member_count = data.approximate_member_count || data.member_count || 0

    return NextResponse.json({ in_guild: true, invite_url, member_count }, { status: 200 })
  } catch (err) {
    console.error('[ - BOT STATUS API - ]', err)
    return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
  }
}
