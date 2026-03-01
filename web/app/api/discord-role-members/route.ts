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
 * Fetches from bot API with a 15s timeout.
 * @param force_refresh - Pass refresh=1 to bust bot's DB cache
 * @returns supporters and staff arrays, plus optional loading flag
 */
async function fetch_from_bot(force_refresh: boolean): Promise<{ supporters: discord_member[]; staff: discord_member[]; loading?: boolean }> {
  const url        = `${__bot_url}/api/credits-members${force_refresh ? '?refresh=1' : ''}`
  const controller = new AbortController()
  const timeout_id = setTimeout(() => controller.abort(), 35000) // 35s — bot cold-start refresh can take up to 30s

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout_id)

    if (!res.ok) {
      console.error(`[ - ROLE MEMBERS - ] Bot API ${res.status}: ${await res.text()}`)
      return { supporters: [], staff: [] }
    }

    return await res.json()
  } catch (err) {
    clearTimeout(timeout_id)
    console.error('[ - ROLE MEMBERS - ] Fetch error:', err)
    return { supporters: [], staff: [] }
  }
}

/**
 * @route GET /api/discord-role-members
 * @description Proxies to bot's /api/credits-members. Stale-while-revalidate on both sides.
 *              Returns immediately — no blocking polls. Client handles retry if loading:true.
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

  const data = await fetch_from_bot(refresh)

  if ((data.supporters?.length ?? 0) > 0 || (data.staff?.length ?? 0) > 0) {
    __cache = { supporters: data.supporters, staff: data.staff, expires_at: Date.now() + __cache_ttl_ms }
  }

  console.info(`[ - ROLE MEMBERS - ] Supporters: ${data.supporters?.length ?? 0}, Staff: ${data.staff?.length ?? 0}, loading: ${data.loading ?? false}`)
  return NextResponse.json({
    supporters : data.supporters ?? [],
    staff      : data.staff      ?? [],
    ...(data.loading ? { loading: true } : {}),
  })
}