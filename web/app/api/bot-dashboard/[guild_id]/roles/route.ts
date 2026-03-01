import { NextRequest, NextResponse } from 'next/server'
import { verify_manage_guild }       from '@/lib/auth'

interface discord_role_raw {
  id       : string
  name     : string
  color    : number
  position : number
  managed  : boolean
}

// - GET GUILD ROLES - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/roles
 * @description Proxies to atomic bot — returns guild roles (no managed, no @everyone)
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

  const bot_url = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://azure48.xyz'

  try {
    const response = await fetch(`${bot_url}/api/guild/${guild_id}/roles`, {
      headers : { Authorization: `Bearer ${process.env.BOT_API_SECRET ?? 'dev-secret'}` },
      next    : { revalidate: 30 },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[ - ROLES API - ] Bot error:', response.status, text)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: response.status })
    }

    const data: { roles: discord_role_raw[] } = await response.json()
    return NextResponse.json({ roles: data.roles ?? [] }, { status: 200 })
  } catch (err) {
    console.error('[ - ROLES API - ]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
