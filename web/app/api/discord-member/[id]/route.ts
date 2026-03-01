import { NextRequest, NextResponse } from 'next/server'

const __bot_url      = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __cache_ttl_ms = 5 * 60 * 1000

// - IN-MEMORY CACHE: user_id → { data, expires_at } - \\
const __cache = new Map<string, { data: unknown; expires_at: number }>()

/**
 * @route GET /api/discord-member/[id]
 * @description Proxies to bot's /api/member/:id for guild-specific member info.
 * @returns JSON with id, username, display_name, avatar, banner, roles, joined_at, etc.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id || !/^\d{17,20}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  const cached = __cache.get(id)
  if (cached && Date.now() < cached.expires_at) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`${__bot_url}/api/member/${id}`, {
      signal: controller.signal,
    })

    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - DISCORD MEMBER - ] Bot API error for ${id}: ${res.status}`)
      return NextResponse.json({ error: 'Member not found' }, { status: res.status })
    }

    const data = await res.json()
    __cache.set(id, { data, expires_at: Date.now() + __cache_ttl_ms })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    console.error(`[ - DISCORD MEMBER - ] Failed to fetch member ${id}:`, err)
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
  }
}
