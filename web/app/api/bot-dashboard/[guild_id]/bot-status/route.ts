import { NextRequest, NextResponse } from 'next/server'

const __manage_guild_bit = 0x20
const __discord_api_base = 'https://discord.com/api/v10'

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

// - CHECK IF BOT IS IN GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/bot-status
 * @description Returns whether the bot is present in the given guild
 * @returns JSON { in_guild: boolean, invite_url: string }
 */
export async function GET(
  req        : NextRequest,
  { params } : { params: Promise<{ guild_id: string }> }
) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const authorized = await verify_manage_guild(access_token, guild_id)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const bot_token = process.env.DISCORD_BOT_TOKEN
  const client_id = process.env.DISCORD_CLIENT_ID ?? ''

  const invite_url = `https://discord.com/oauth2/authorize?client_id=${client_id}&permissions=8&scope=bot+applications.commands&guild_id=${guild_id}`

  if (!bot_token) return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })

  try {
    const response = await fetch(`${__discord_api_base}/guilds/${guild_id}`, {
      headers : { Authorization: `Bot ${bot_token}` },
      next    : { revalidate: 0 },
    })

    return NextResponse.json({ in_guild: response.ok, invite_url }, { status: 200 })
  } catch (err) {
    console.error('[ - BOT STATUS API - ]', err)
    return NextResponse.json({ in_guild: false, invite_url }, { status: 200 })
  }
}
