import { NextRequest, NextResponse } from 'next/server'
import { Pool }                     from 'pg'
import type { prodete_entry }       from '@/types/prodete'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

/**
 * Fetches a prodete report by slug.
 * @route GET /api/prodete/[slug]
 * @returns JSON { slug, from_date, to_date, entries, generated_by, generated_at } or 404
 */
export async function GET(
  _req    : NextRequest,
  context : { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await context.params

  if (!slug || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format.' }, { status: 400 })
  }

  const client = await pool.connect()

  try {
    const result = await client.query<{
      slug          : string
      from_date     : string
      to_date       : string
      entries       : prodete_entry[] | string
      channel_names : Record<string, string> | string | null
      generated_by  : string
      generated_at  : string
    }>(`
      SELECT slug, from_date, to_date, entries, channel_names, generated_by, generated_at
      FROM prodete_reports
      WHERE slug = $1
    `, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
    }

    const row = result.rows[0]

    return NextResponse.json({
      slug          : row.slug,
      from_date     : row.from_date,
      to_date       : row.to_date,
      entries       : typeof row.entries === 'string' ? JSON.parse(row.entries) : row.entries,
      channel_names : row.channel_names == null ? {} : typeof row.channel_names === 'string' ? JSON.parse(row.channel_names) : row.channel_names,
      generated_by  : row.generated_by,
      generated_at  : Number(row.generated_at),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[ - PRODETE API - ] Failed to get report:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  } finally {
    client.release()
  }
}
