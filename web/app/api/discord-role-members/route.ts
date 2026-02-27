import { NextRequest, NextResponse } from 'next/server'

const __bot_url      = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __cache_ttl_ms = 5 * 60 * 1000

interface discord_member {
  id        : string
  username  : string
  avatar_url: string
}

interface cache_entry {
  supporters : discord_member[]
  staff      : discord_member[]
  expires_at : number
}

let __cache: cache_entry | null = null

/**
 * @route GET /api/discord-role-members
 * @description Proxies to bot's /api/credits-members — single paginated REST fetch, splits by role.
 * @returns JSON { supporters: discord_member[]; staff: discord_member[] }
 */
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === '1'

  if (!refresh && __cache && Date.now() < __cache.expires_at) {
    return NextResponse.json(
      { supporters: __cache.supporters, staff: __cache.staff },
      { headers: { 'X-Cache': 'HIT' } },
    )
  }

  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${__bot_url}/api/credits-members`, {
      signal: controller.signal,
    })

    clearTimeout(timeout_id)

    if (!res.ok) {
      const text = await res.text()
      console.error(`[ - ROLE MEMBERS - ] Bot API ${res.status}: ${text}`)
      return NextResponse.json({ error: 'Bot API error' }, { status: res.status })
    }

    const data = await res.json() as { supporters: discord_member[]; staff: discord_member[] }

    console.info(`[ - ROLE MEMBERS - ] Supporters: ${data.supporters.length}, Staff: ${data.staff.length}`)

    if (data.supporters.length > 0 || data.staff.length > 0) {
      __cache = { supporters: data.supporters, staff: data.staff, expires_at: Date.now() + __cache_ttl_ms }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[ - ROLE MEMBERS - ] Failed to fetch members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}