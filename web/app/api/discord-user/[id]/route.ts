import { NextRequest, NextResponse } from 'next/server'

const __discord_api   = 'https://discord.com/api/v10'
const __cdn           = 'https://cdn.discordapp.com'
const __cache_ttl_ms  = 30 * 60 * 1000

// - IN-MEMORY CACHE: user_id → { avatar_url, expires_at } - \\
const __cache = new Map<string, { avatar_url: string; username: string; expires_at: number }>()

/**
 * Resolves the CDN avatar URL for a Discord user.
 * Falls back to default avatar if user has none.
 *
 * @param user_id   - Discord user snowflake ID
 * @param avatar    - Avatar hash or null
 * @returns Full CDN URL string
 */
function resolve_avatar_url(user_id: string, avatar: string | null): string {
  if (avatar) {
    const ext = avatar.startsWith('a_') ? 'gif' : 'png'
    return `${__cdn}/avatars/${user_id}/${avatar}.${ext}?size=128`
  }

  // - DEFAULT AVATAR INDEX (new system: user_id >> 22 % 6) - \\
  const index = Number(BigInt(user_id) >> BigInt(22)) % 6
  return `${__cdn}/embed/avatars/${index}.png`
}

/**
 * @route GET /api/discord-user/[id]
 * @description Fetches a Discord user's avatar URL via bot token. Cached 30 min.
 * @returns JSON { avatar_url: string; username: string }
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id || !/^\d{17,20}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  // - RETURN CACHED RESULT IF STILL VALID - \\
  const cached = __cache.get(id)
  if (cached && Date.now() < cached.expires_at) {
    return NextResponse.json(
      { avatar_url: cached.avatar_url, username: cached.username },
      { headers: { 'X-Cache': 'HIT' } },
    )
  }

  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 503 })
  }

  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${__discord_api}/users/${id}`, {
      headers : { Authorization: `Bot ${token}` },
      signal  : controller.signal,
    })

    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - DISCORD USER - ] Failed to fetch user ${id}: ${res.status}`)
      return NextResponse.json({ error: 'Discord API error' }, { status: res.status })
    }

    const user       = await res.json()
    const avatar_url = resolve_avatar_url(id, user.avatar ?? null)
    const username   = user.global_name ?? user.username ?? ''

    __cache.set(id, { avatar_url, username, expires_at: Date.now() + __cache_ttl_ms })

    return NextResponse.json({ avatar_url, username }, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    })
  } catch (error) {
    console.error(`[ - DISCORD USER - ] Error fetching user ${id}:`, error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
