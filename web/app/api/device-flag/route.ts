import { NextRequest, NextResponse }        from 'next/server'
import { connect, find_one, insert_one }   from '@/lib/utils/database'

export const dynamic = 'force-dynamic'

const __collection = 'device_flags'

/**
 * @route GET /api/device-flag?fp=<fingerprint>
 * @description Check if a device fingerprint has been flagged
 */
export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get('fp')
  if (!fp || fp.length < 32) return NextResponse.json({ flagged: false })

  try {
    await connect()
    const record = await find_one(__collection, { fp })
    console.log("[ - DEVICE FLAG CHECK - ] fp:", fp, "record:", record)
    return NextResponse.json({ flagged: !!record })
  } catch (err) {
    console.log("[ - DEVICE FLAG CHECK ERR - ]", err)
    return NextResponse.json({ flagged: false })
  }
}

/**
 * @route POST /api/device-flag
 * @description Flag a device fingerprint (called server-side after blacklist confirmed)
 */
export async function POST(req: NextRequest) {
  try {
    const { fp } = await req.json()
    if (!fp || fp.length < 32) return NextResponse.json({ ok: false })

    await connect()
    const existing = await find_one(__collection, { fp })
    if (!existing) {
      await insert_one(__collection, { fp, flagged_at: Date.now() })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
