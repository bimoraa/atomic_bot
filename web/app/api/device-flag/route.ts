import { NextRequest, NextResponse }        from 'next/server'
import { connect, find_one, insert_one }   from '@/lib/utils/database'

export const dynamic = 'force-dynamic'

const __collection       = 'device_flags'
const __internal_secret  = process.env.INTERNAL_API_SECRET
const __fp_min_length    = 32
const __fp_max_length    = 256

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
 * @description Flag a device fingerprint. Requires internal secret header.
 */
export async function POST(req: NextRequest) {
  const provided_secret = req.headers.get('x-internal-secret')
  if (!__internal_secret || provided_secret !== __internal_secret) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  try {
    const { fp } = await req.json()
    if (!fp || typeof fp !== 'string' || fp.length < __fp_min_length || fp.length > __fp_max_length) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    await connect()
    const existing = await find_one(__collection, { fp })
    if (!existing) {
      await insert_one(__collection, { fp, flagged_at: Date.now() })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
