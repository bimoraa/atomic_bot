import { NextRequest, NextResponse }                          from 'next/server'
import { get_bypass_guild_stats, get_bypass_guild_total }   from '@/lib/db'

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

// - GET BYPASS STATS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/stats
 * @description Returns per-guild bypass stats (daily counts, total)
 * @returns JSON { total, today, this_week, chart: [{ date, count }] }
 */
export async function GET(
  req     : NextRequest,
  { params } : { params: Promise<{ guild_id: string }> }
) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const allowed = await verify_manage_guild(access_token, guild_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const [rows, total] = await Promise.all([
      get_bypass_guild_stats(guild_id, 14),
      get_bypass_guild_total(guild_id),
    ])

    const today_str   = new Date().toISOString().slice(0, 10)
    const week_ago    = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)

    const today       = rows.find(r => r.date === today_str)?.count ?? 0
    const this_week   = rows.filter(r => r.date >= week_ago).reduce((s, r) => s + r.count, 0)

    return NextResponse.json({ total, today, this_week, chart: rows })
  } catch (err) {
    console.error('[ - BYPASS GUILD STATS - ] Error fetching stats:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
