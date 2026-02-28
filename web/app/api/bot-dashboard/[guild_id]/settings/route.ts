import { NextRequest, NextResponse }                                           from 'next/server'
import { get_bypass_guild_settings, set_bypass_guild_settings,
         remove_bypass_guild_setting }                                         from '@/lib/db'

const __manage_guild_bit = 0x20

/**
 * @param access_token - Discord access token  
 * @param guild_id     - Guild to verify
 * @returns Whether user has ManageGuild in that guild
 */
async function verify_manage_guild(access_token: string, guild_id: string): Promise<boolean> {
  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` },
      next   : { revalidate: 0 },
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

// - GET SETTINGS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/settings
 * @description Returns bypass settings for a guild
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ guild_id: string }> }) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const allowed = await verify_manage_guild(access_token, guild_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await get_bypass_guild_settings(guild_id)
  return NextResponse.json({ settings: settings ?? {} })
}

// - UPDATE SETTINGS FOR A GUILD - \\
/**
 * @route POST /api/bot-dashboard/[guild_id]/settings
 * @description Updates bypass settings for a guild
 * @body { bypass_channel?: string, bypass_enabled?: string, bypass_disabled_reason?: string, clear_channel?: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ guild_id: string }> }) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const allowed = await verify_manage_guild(access_token, guild_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, string | boolean>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // - CLEAR CHANNEL - \\
  if (body.clear_channel) {
    await remove_bypass_guild_setting(guild_id, 'bypass_channel')
    return NextResponse.json({ success: true })
  }

  const patch: Record<string, string> = {}

  if (typeof body.bypass_channel === 'string') {
    patch.bypass_channel = body.bypass_channel.trim()
  }

  if (body.bypass_enabled === 'true' || body.bypass_enabled === 'false') {
    patch.bypass_enabled = body.bypass_enabled

    if (body.bypass_enabled === 'true') {
      // - Remove disabled reason when re-enabling - \\
      await remove_bypass_guild_setting(guild_id, 'bypass_disabled_reason')
    }
  }

  if (typeof body.bypass_disabled_reason === 'string') {
    patch.bypass_disabled_reason = body.bypass_disabled_reason.trim()
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const ok = await set_bypass_guild_settings(guild_id, patch)
  if (!ok) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json({ success: true })
}
