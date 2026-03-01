import { NextRequest, NextResponse } from 'next/server'
import { verify_manage_guild }       from '@/lib/auth'

// - DISCORD CHANNEL TYPES - \\
const __text_channel     = 0
const __category_channel = 4

interface discord_channel {
  id        : string
  name      : string
  type      : number
  parent_id : string | null
  position  : number
}

interface channel_entry {
  id   : string
  name : string
}

interface category_group {
  id       : string | null
  name     : string
  channels : channel_entry[]
}

// - GET CHANNELS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/channels
 * @description Proxies to atomic bot — returns text channels grouped by category
 * @returns JSON { categories: [{ id, name, channels: [{id, name}] }], channels: discord_channel[] }
 */
export async function GET(
  req        : NextRequest,
  { params } : { params: Promise<{ guild_id: string }> }
) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const allowed = await verify_manage_guild(access_token, guild_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const bot_url = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://azure48.xyz'

  try {
    const res = await fetch(`${bot_url}/api/guild/${guild_id}/channels`, {
      headers : { Authorization: `Bearer ${process.env.BOT_API_SECRET ?? 'dev-secret'}` },
      next    : { revalidate: 30 },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[ - CHANNELS API - ] Bot error:', res.status, body)
      return NextResponse.json({ error: 'Failed to fetch channels from bot' }, { status: res.status })
    }

    const data: { channels: discord_channel[]; categories: { id: string; name: string }[] } = await res.json()

    const all_channels  = data.channels ?? []
    const raw_categories = data.categories ?? []

    // - GROUP TEXT CHANNELS BY CATEGORY - \\
    const text_channels = all_channels
      .filter(ch => ch.type === __text_channel)
      .sort((a, b) => a.position - b.position)

    const grouped = new Map<string | null, channel_entry[]>()
    for (const ch of text_channels) {
      const key = ch.parent_id ?? null
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ id: ch.id, name: ch.name })
    }

    const categories: category_group[] = []

    const uncategorized = grouped.get(null)
    if (uncategorized?.length) {
      categories.push({ id: null, name: 'Uncategorized', channels: uncategorized })
    }

    const sorted_cats = all_channels
      .filter(ch => ch.type === __category_channel)
      .sort((a, b) => a.position - b.position)

    for (const cat of sorted_cats) {
      const channels = grouped.get(cat.id)
      if (channels?.length) categories.push({ id: cat.id, name: cat.name, channels })
    }

    return NextResponse.json({ categories, channels: text_channels })
  } catch (err) {
    console.error('[ - CHANNELS API - ] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
