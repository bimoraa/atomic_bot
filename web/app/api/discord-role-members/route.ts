import { NextRequest, NextResponse } from 'next/server'

const __bot_url       = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __cache_ttl_ms  = 5 * 60 * 1000

// - ROLE CONSTANTS - \\
const __role_supporter = '1357767950421065981'
const __role_staff     = '1264915024707588208'

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
 * Calls the bot's /api/role-members/:role_id endpoint.
 *
 * @param role_id - Discord role snowflake
 * @returns Array of members
 */
async function fetch_role_from_bot(role_id: string): Promise<discord_member[]> {
  const controller = new AbortController()
  const timeout_id = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${__bot_url}/api/role-members/${role_id}`, {
      signal: controller.signal,
    })

    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - ROLE MEMBERS - ] Bot API error for role ${role_id}: ${res.status}`)
      return []
    }

    const data = await res.json()
    return Array.isArray(data.members) ? data.members : []
  } catch (err) {
    clearTimeout(timeout_id)
    console.error(`[ - ROLE MEMBERS - ] Failed to fetch role ${role_id}:`, err)
    return []
  }
}

/**
 * @route GET /api/discord-role-members
 * @description Returns guild members by supporter/staff role via bot API. Cached 5 min.
 * @returns JSON { supporters: discord_member[]; staff: discord_member[] }
 */
export async function GET(_req: NextRequest) {
  if (__cache && Date.now() < __cache.expires_at) {
    return NextResponse.json(
      { supporters: __cache.supporters, staff: __cache.staff },
      { headers: { 'X-Cache': 'HIT' } },
    )
  }

  try {
    // - FETCH BOTH ROLES IN PARALLEL FROM BOT API - \\
    const [supporters, staff] = await Promise.all([
      fetch_role_from_bot(__role_supporter),
      fetch_role_from_bot(__role_staff),
    ])

    __cache = { supporters, staff, expires_at: Date.now() + __cache_ttl_ms }

    return NextResponse.json({ supporters, staff }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (error) {
    console.error('[ - ROLE MEMBERS - ] Failed to fetch members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
