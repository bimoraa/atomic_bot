import { NextRequest, NextResponse } from 'next/server'

const __manage_guild_bit = 0x20
const __discord_api_base = 'https://discord.com/api/v10'

interface discord_role_raw {
  id       : string
  name     : string
  color    : number
  position : number
  managed  : boolean
}

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

// - GET GUILD ROLES - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/roles
 * @description Returns guild roles sorted by position (managed + @everyone excluded)
 * @returns JSON { roles: [{ id, name, color, position }][] }
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

  const bot_token = process.env.DISCORD_BOT_TOKEN
  if (!bot_token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 503 })

  try {
    const response = await fetch(`${__discord_api_base}/guilds/${guild_id}/roles`, {
      headers : { Authorization: `Bot ${bot_token}` },
      next    : { revalidate: 30 },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[ - ROLES API - ] Discord error:', response.status, text)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: response.status })
    }

    const raw: discord_role_raw[] = await response.json()

    const roles = raw
      .filter(r => !r.managed && r.id !== guild_id)  // - exclude @everyone and bot-managed roles - \\
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id       : r.id,
        name     : r.name,
        color    : r.color,
        position : r.position,
      }))

    return NextResponse.json({ roles }, { status: 200 })
  } catch (err) {
    console.error('[ - ROLES API - ]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
