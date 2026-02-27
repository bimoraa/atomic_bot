import { NextRequest, NextResponse } from 'next/server'

const __guild_id       = '1250337227582472243'
const __role_supporter = '1357767950421065981'
const __role_staff     = '1264915024707588208'
const __cache_ttl_ms   = 5 * 60 * 1000
const __discord_api    = 'https://discord.com/api/v10'
const __cdn            = 'https://cdn.discordapp.com'

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

interface raw_member {
  user  : { id: string; username: string; global_name?: string; avatar?: string | null }
  nick ?: string | null
  avatar?: string | null
  roles  : string[]
}

let __cache: cache_entry | null = null

/**
 * @param m - Raw Discord guild member from REST API
 * @returns CDN avatar URL
 */
function get_avatar(m: raw_member): string {
  if (m.avatar) {
    const ext = m.avatar.startsWith('a_') ? 'gif' : 'png'
    return `${__cdn}/guilds/${__guild_id}/users/${m.user.id}/avatars/${m.avatar}.${ext}?size=64`
  }
  if (m.user.avatar) {
    const ext = m.user.avatar.startsWith('a_') ? 'gif' : 'png'
    return `${__cdn}/avatars/${m.user.id}/${m.user.avatar}.${ext}?size=64`
  }
  return `${__cdn}/embed/avatars/${Number(BigInt(m.user.id) >> BigInt(22)) % 6}.png`
}

/**
 * @route GET /api/discord-role-members
 * @description Fetches all guild members via paginated Discord REST API, splits into supporter/staff.
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

  const bot_token = process.env.ATOMIC_BOT_TOKEN
  if (!bot_token) {
    console.error('[ - ROLE MEMBERS - ] ATOMIC_BOT_TOKEN is not set')
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  try {
    // - SINGLE PAGINATED PASS — FETCH ALL MEMBERS, THEN SPLIT BY ROLE - \\
    const all: raw_member[] = []
    let   after             = ''

    while (true) {
      const url      = `${__discord_api}/guilds/${__guild_id}/members?limit=1000${after ? `&after=${after}` : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${bot_token}` },
        cache  : 'no-store',
      })

      if (!response.ok) {
        const text = await response.text()
        console.error(`[ - ROLE MEMBERS - ] Discord API ${response.status}: ${text}`)
        break
      }

      const page: raw_member[] = await response.json()
      all.push(...page)

      if (page.length < 1000) break
      after = page[page.length - 1]!.user.id
    }

    console.info(`[ - ROLE MEMBERS - ] Total members fetched: ${all.length}`)

    const to_member = (m: raw_member): discord_member => ({
      id        : m.user.id,
      username  : m.nick ?? m.user.global_name ?? m.user.username,
      avatar_url: get_avatar(m),
    })

    const supporters = all.filter(m => m.roles.includes(__role_supporter)).map(to_member)
    const staff      = all.filter(m => m.roles.includes(__role_staff)).map(to_member)

    console.info(`[ - ROLE MEMBERS - ] Supporters: ${supporters.length}, Staff: ${staff.length}`)

    if (supporters.length > 0 || staff.length > 0) {
      __cache = { supporters, staff, expires_at: Date.now() + __cache_ttl_ms }
    }

    return NextResponse.json({ supporters, staff })
  } catch (error) {
    console.error('[ - ROLE MEMBERS - ] Failed to fetch members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
