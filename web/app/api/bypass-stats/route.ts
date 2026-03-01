import { NextResponse }         from 'next/server'
import { get_bypass_count }    from '@/lib/db'

/**
 * @route GET /api/bypass-stats
 * @description Returns total bypassed link count.
 * @returns JSON { count: number }
 */
export async function GET() {
  try {
    const count = await get_bypass_count()
    return NextResponse.json({ count }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[ - BYPASS STATS - ] Failed to get count:', error)
    return NextResponse.json({ count: 87000 }, { status: 200 })
  }
}
