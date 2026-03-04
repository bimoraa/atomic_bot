import { NextRequest, NextResponse } from 'next/server'
import { connect } from '@/lib/utils/database'
import { decrypt_session } from '@/lib/utils/session'

const __allowed_user_id = '1118453649727823974'

// - GET ALL TRANSCRIPTS - \\
/**
 * @route GET /api/transcripts
 * @description Fetch all transcripts from database (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // - Check authentication - \\
    const discord_user_cookie = req.cookies.get('discord_user')
    
    if (!discord_user_cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await decrypt_session(discord_user_cookie.value)
    
    if (!user || user.id !== __allowed_user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // - Fetch transcripts from bot API - \\
    const bot_url = process.env.NEXT_PUBLIC_BOT_URL || 'https://azure48.xyz'
    console.log('[ - TRANSCRIPTS API - ] Fetching from:', `${bot_url}/api/transcripts`)
    
    const response = await fetch(`${bot_url}/api/transcripts`, {
      headers: {
        'Authorization': `Bearer ${process.env.BOT_API_SECRET || 'dev-secret'}`,
      },
    })

    if (!response.ok) {
      const error_text = await response.text()
      console.error('[ - TRANSCRIPTS API - ] Failed to fetch transcripts:', response.status, error_text)
      return NextResponse.json({ 
        error: 'Failed to fetch transcripts',
        status: response.status,
        details: error_text 
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('[ - TRANSCRIPTS API - ] Fetched:', data.total, 'transcripts')
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ - TRANSCRIPTS API - ] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
