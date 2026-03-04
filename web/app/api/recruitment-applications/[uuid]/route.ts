import { NextRequest, NextResponse }                              from 'next/server'
import { update_application_review, delete_application_by_uuid } from '@/lib/database/managers/staff_application_manager'
import { connect }                                                from "@/lib/utils/database"
import { check_auth, is_valid_uuid }                             from '@/lib/utils/auth'

const __valid_flags = ['pending', 'approved', 'declined'] as const
const __max_note_length = 1000

/**
 * @route PATCH /api/recruitment-applications/[uuid]
 * @description Save note + flag on an application. Reviewer identity taken from session cookie.
 * @param req - { note?: string, flag?: 'pending' | 'approved' | 'declined' }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const user = await check_auth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uuid } = await params
  if (!is_valid_uuid(uuid)) return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })

  try {
    const body  = await req.json()
    const patch: Record<string, any> = {}

    if (body.flag !== undefined) {
      if (!__valid_flags.includes(body.flag)) {
        return NextResponse.json({ error: `Invalid flag. Must be one of: ${__valid_flags.join(', ')}` }, { status: 400 })
      }
      patch.flag = body.flag
    }

    if (body.note !== undefined) {
      if (typeof body.note !== 'string') return NextResponse.json({ error: 'Note must be a string' }, { status: 400 })
      patch.note = body.note.trim().slice(0, __max_note_length)
    }

    patch.reviewed_by = user.username || user.global_name || user.id
    patch.reviewed_at = Date.now()

    await connect()
    await update_application_review(uuid, patch)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ - REVIEW PATCH API - ] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * @route DELETE /api/recruitment-applications/[uuid]
 * @description Delete an application by UUID
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const user = await check_auth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uuid } = await params
  if (!is_valid_uuid(uuid)) return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })

  try {
    await connect()
    await delete_application_by_uuid(uuid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ - DELETE APP API - ] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
