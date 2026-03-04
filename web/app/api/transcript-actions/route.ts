import { NextRequest, NextResponse } from 'next/server'
import { connect } from '@/lib/utils/database'
import { decrypt_session } from '@/lib/utils/session'

// - ENSURE TABLE EXISTS - \\
const __ensure_table = async () => {
  const pool = await connect()
  if (!pool) throw new Error("No database connection")
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transcript_message_actions (
        id             SERIAL PRIMARY KEY,
        transcript_id  VARCHAR(255) NOT NULL,
        message_id     VARCHAR(255) NOT NULL,
        actor_id       VARCHAR(255),
        actor_tag      VARCHAR(255),
        action_type    VARCHAR(50)  NOT NULL,
        comment_text   TEXT,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)
  } finally {
    client.release()
  }
}

// - GET ACTIONS FOR TRANSCRIPT - \\
const __get_actions = async (transcript_id: string) => {
  const pool = await connect()
  if (!pool) throw new Error("No database connection")
  const client = await pool.connect()
  try {
    const res = await client.query(
      `SELECT * FROM transcript_message_actions WHERE transcript_id = $1 ORDER BY created_at ASC`,
      [transcript_id]
    )
    return res.rows
  } finally {
    client.release()
  }
}

// - POST /api/transcript-actions - \\
/**
 * @description Save a flag, comment, or download action for a message
 * @param req - NextRequest with body { type, message_id, transcript_id, comment_text? }
 * @returns Saved action record or error
 */
export async function POST(req: NextRequest) {
  try {
    await __ensure_table()

    const discord_user_cookie = req.cookies.get('discord_user')
    const user = discord_user_cookie ? await decrypt_session(discord_user_cookie.value) : null

    const body         = await req.json()
    const action_type  = body.action_type  as string
    const message_id   = body.message_id   as string
    const transcript_id = body.transcript_id as string
    const comment_text = body.comment_text as string | undefined

    if (!action_type || !message_id || !transcript_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['flag', 'comment', 'download'].includes(action_type)) {
      return NextResponse.json({ error: 'Invalid action_type' }, { status: 400 })
    }

    const pool = await connect()
    if (!pool) throw new Error("No database connection")
    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO transcript_message_actions
           (transcript_id, message_id, actor_id, actor_tag, action_type, comment_text)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          transcript_id,
          message_id,
          user?.id || 'anonymous',
          user?.username || 'Anonymous',
          action_type,
          comment_text || null,
        ]
      )

      console.log(`[ - TRANSCRIPT ACTION - ] ${action_type} saved for message ${message_id}`)
      return NextResponse.json({ success: true, action: result.rows[0] })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[ - TRANSCRIPT ACTION - ] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// - GET /api/transcript-actions?transcript_id=xxx - \\
/**
 * @description Get all actions for a transcript
 * @param req - NextRequest with query param transcript_id
 * @returns List of actions
 */
export async function GET(req: NextRequest) {
  try {
    await __ensure_table()

    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url)
      const transcript_id = searchParams.get('transcript_id')

      if (!transcript_id) {
        return NextResponse.json({ error: 'Missing transcript_id' }, { status: 400 })
      }

      const pool = await connect()
      if (!pool) throw new Error("No database connection")
      const client = await pool.connect()
      try {
        const result = await client.query(
          `SELECT * FROM transcript_message_actions WHERE transcript_id = $1 ORDER BY created_at ASC`,
          [transcript_id]
        )
        return NextResponse.json({ actions: result.rows })
      } finally {
        client.release()
      }
    }
  } catch (err) {
    console.error('[ - TRANSCRIPT ACTION GET - ] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
