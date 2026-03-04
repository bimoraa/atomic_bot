import { NextRequest, NextResponse } from "next/server"
import { delete_application }        from "@/lib/database/managers/staff_application_manager"
import { connect }                    from "@/lib/utils/database"

const __admin_secret = process.env.ADMIN_SECRET

/**
 * @route DELETE /api/staff-application/reset?id=DISCORD_ID
 * @description Admin endpoint to delete a specific user's application by discord ID.
 * Requires Authorization: Bearer <ADMIN_SECRET> header.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!__admin_secret) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 })
    }

    const auth_header  = req.headers.get('authorization') || ''
    const token        = auth_header.startsWith('Bearer ') ? auth_header.slice(7) : ''
    if (!token || token !== __admin_secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const discord_id       = searchParams.get("id")

    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      return NextResponse.json({ error: "Missing or invalid id parameter" }, { status: 400 })
    }

    await connect()
    const deleted = await delete_application(discord_id)

    if (!deleted) {
      return NextResponse.json({ error: "No application found for that ID." }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: `Application for ${discord_id} deleted.` })
  } catch (error) {
    console.error("[ - STAFF APP RESET API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
