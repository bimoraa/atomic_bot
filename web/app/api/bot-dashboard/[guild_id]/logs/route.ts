import { NextRequest, NextResponse }                               from 'next/server'
import { get_bypass_logs, count_bypass_logs, delete_bypass_logs }  from '@/lib/db'
import { verify_manage_guild }                                     from '@/lib/auth'

// - GET BYPASS LOGS FOR A GUILD - \\
/**
 * @route GET /api/bot-dashboard/[guild_id]/logs
 * @param limit  - Number of rows to fetch (default 30)
 * @param offset - Pagination offset (default 0)
 * @returns JSON { logs: bypass_log_row[], total: number }
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

  const { searchParams } = req.nextUrl
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '30', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  try {
    const [logs, total] = await Promise.all([
      get_bypass_logs(guild_id, limit, offset),
      count_bypass_logs(guild_id),
    ])
    return NextResponse.json({ logs, total }, { status: 200 })
  } catch (err) {
    console.error('[ - LOGS API - ]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// - DELETE ALL BYPASS LOGS FOR A GUILD - \\
/**
 * @route DELETE /api/bot-dashboard/[guild_id]/logs
 * @description Deletes all bypass logs for a guild (irreversible)
 * @returns JSON { success: true, deleted: number }
 */
export async function DELETE(
  req        : NextRequest,
  { params } : { params: Promise<{ guild_id: string }> }
) {
  const access_token = req.cookies.get('discord_access_token')?.value
  if (!access_token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { guild_id } = await params

  const authorized = await verify_manage_guild(access_token, guild_id)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const deleted = await delete_bypass_logs(guild_id)
    return NextResponse.json({ success: true, deleted }, { status: 200 })
  } catch (err) {
    console.error('[ - LOGS DELETE API - ]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
