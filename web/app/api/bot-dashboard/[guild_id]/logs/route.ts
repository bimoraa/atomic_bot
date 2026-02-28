import { NextRequest, NextResponse }            from 'next/server'
import { get_bypass_logs, count_bypass_logs }   from '@/lib/db'

const __manage_guild_bit = 0x20

/**
 * @param access_token - Discord access token
 * @param guild_id     - Guild to verify
 * @returns Whether user has ManageGuild in that guild
 */
async function verify_manage_guild(access_token: string, guild_id: string): Promise<boolean> {
  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers : { Authorization: `Bearer ${access_token}` },
      next    : { revalidate: 0 },
    })
    if (!response.ok) return false
    const guilds: Array<{ id: string; permissions: string }> = await response.json()
    const guild = guilds.find(g => g.id === guild_id)
    if (!guild) return false
    return (BigInt(guild.permissions) & BigInt(__manage_guild_bit)) !== BigInt(0)
  } catch {
    return false
  }
}

// - GET BYPASS LOGS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/logs
 * @param limit  - Number of rows to fetch (default 30)
 * @param offset - Pagination offset (default 0)
 * @returns JSON { logs: bypass_log_row[], total: number }
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

  const { searchParams } = req.nextUrl
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '30', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  try {
    const [logs, total] = await Promise.all([
      get_bypass_logs(guild_id, limit, offset),
      count_bypass_logs(guild_id),
    ])
    return NextResponse.json({ logs, total }, { status: 200 })
  } catch (err) {
    console.error('[ - LOGS API - ]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
