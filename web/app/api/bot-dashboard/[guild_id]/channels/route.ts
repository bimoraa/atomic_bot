import { NextRequest, NextResponse } from 'next/server'

const __manage_guild_bit = 0x20

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

// - GET CHANNELS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/channels
 * @description Returns text channels grouped by category for a guild
 * @returns JSON { categories: [{ id, name, channels: [{id, name}] }] }
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

  const bot_token = process.env.DISCORD_BOT_TOKEN
  if (!bot_token) {
    console.error('[ - CHANNELS API - ] DISCORD_BOT_TOKEN not set')
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/channels`, {
      headers : { Authorization: `Bot ${bot_token}` },
      next    : { revalidate: 30 },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[ - CHANNELS API - ] Discord API error:', res.status, body)
      return NextResponse.json({ error: 'Failed to fetch channels from Discord' }, { status: res.status })
    }

    const all_channels: discord_channel[] = await res.json()

    // - BUILD CATEGORY MAP - \\
    const categories_map = new Map<string, string>()
    for (const ch of all_channels) {
      if (ch.type === __category_channel) {
        categories_map.set(ch.id, ch.name)
      }
    }

    // - COLLECT TEXT CHANNELS - \\
    const text_channels = all_channels
      .filter(ch => ch.type === __text_channel)
      .sort((a, b) => a.position - b.position)

    // - GROUP BY CATEGORY - \\
    const grouped = new Map<string | null, channel_entry[]>()

    for (const ch of text_channels) {
      const key = ch.parent_id ?? null
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ id: ch.id, name: ch.name })
    }

    const categories: category_group[] = []

    // - UNCATEGORIZED FIRST - \\
    const uncategorized = grouped.get(null)
    if (uncategorized?.length) {
      categories.push({ id: null, name: 'Uncategorized', channels: uncategorized })
    }

    // - THEN EACH CATEGORY SORTED BY POSITION - \\
    const sorted_cats = all_channels
      .filter(ch => ch.type === __category_channel)
      .sort((a, b) => a.position - b.position)

    for (const cat of sorted_cats) {
      const channels = grouped.get(cat.id)
      if (channels?.length) {
        categories.push({ id: cat.id, name: cat.name, channels })
      }
    }

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('[ - CHANNELS API - ] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
