import { NextRequest, NextResponse }      from "next/server"
import { get_application_by_uuid }        from "@/lib/database/managers/staff_application_manager"
import { connect }                         from "@/lib/utils/database"
import { check_auth, check_session, is_valid_uuid } from '@/lib/utils/auth'

/**
 * @route GET /api/staff-application/[uuid]
 * @description Fetch a single staff application by UUID.
 * Accessible by the applicant themselves or by authorized staff.
 * @returns JSON staff_application data
 */
export async function GET(
  req        : NextRequest,
  { params } : { params: Promise<{ uuid: string }> }
) {
  try {
    const session = check_session(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uuid } = await params
    if (!is_valid_uuid(uuid)) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 })
    }

    await connect()
    const application = await get_application_by_uuid(uuid)

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // - ALLOW OWNER OR AUTHORIZED STAFF - \\
    const is_owner = application.discord_id === session.id
    if (!is_owner) {
      const staff = await check_auth(req)
      if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("[ - STAFF APP GET API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
