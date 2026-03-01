import { NextRequest, NextResponse } from 'next/server'

const __bot_url      = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __cache_ttl_ms = 10 * 60 * 1000

// - IN-MEMORY CACHE: channel_id → { data, expires_at } - \\
const __cache = new Map<string, { data: unknown; expires_at: number }>()

/**
 * @route GET /api/discord-channel/[id]
 * @description Proxies to bot's /api/channel/:id for guild channel info.
 * @param id - Discord channel ID
 * @returns JSON with id, name, type, etc.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id || !/^\d{17,20}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
  }

  const cached = __cache.get(id)
  if (cached && Date.now() < cached.expires_at) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`${__bot_url}/api/channel/${id}`, {
      signal: controller.signal,
    })

    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - DISCORD CHANNEL - ] Bot API error for ${id}: ${res.status}`)
      return NextResponse.json({ error: 'Channel not found' }, { status: res.status })
    }

    const data = await res.json()

    __cache.set(id, { data, expires_at: Date.now() + __cache_ttl_ms })

    return NextResponse.json(data)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 })
    }
    console.error(`[ - DISCORD CHANNEL - ] Unexpected error for ${id}:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
