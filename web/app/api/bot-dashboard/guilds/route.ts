import { NextRequest, NextResponse } from 'next/server'

const __manage_guild_bit = 0x20

export interface discord_guild_item {
  id             : string
  name           : string
  icon           : string | null
  has_manage     : boolean   // user has ManageGuild
}

// - FETCH USER GUILDS FROM DISCORD - \\
/**
 * @route GET /api/bot-dashboard/guilds
 * @description Returns guilds where user has ManageGuild, using stored access token
 * @returns JSON { guilds: discord_guild_item[] }
 */
export async function GET(req: NextRequest) {
  const access_token = req.cookies.get('discord_access_token')?.value

  if (!access_token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` },
      next   : { revalidate: 0 },
    })

    if (!response.ok) {
      console.error('[ - BOT DASHBOARD - ] Failed to fetch guilds:', response.status)
      return NextResponse.json({ error: 'Failed to fetch guilds from Discord' }, { status: 502 })
    }

    const raw: Array<{
      id          : string
      name        : string
      icon        : string | null
      permissions : string
    }> = await response.json()

    const guilds: discord_guild_item[] = raw
      .filter(g => (BigInt(g.permissions) & BigInt(__manage_guild_bit)) !== BigInt(0))
      .map(g => ({
        id         : g.id,
        name       : g.name,
        icon       : g.icon,
        has_manage : true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ guilds })
  } catch (err) {
    console.error('[ - BOT DASHBOARD - ] Guilds error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
