import { NextRequest, NextResponse }      from "next/server"
import { get_application_by_uuid }        from "../../../../../src/shared/database/managers/staff_application_manager"
import { connect }                         from "../../../../../src/shared/utils/database"

/**
 * @route GET /api/staff-application/[uuid]
 * @description Fetch a single staff application by UUID
 * @returns JSON staff_application data
 */
export async function GET(
  req        : NextRequest,
  { params } : { params: Promise<{ uuid: string }> }
) {
  try {
    const discord_user_cookie = req.cookies.get("discord_user")
    if (!discord_user_cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { uuid } = await params

    if (!uuid || uuid.length < 10) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 })
    }

    await connect()
    const application = await get_application_by_uuid(uuid)

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("[ - STAFF APP GET API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
