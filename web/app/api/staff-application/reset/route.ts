import { NextRequest, NextResponse } from "next/server"
import { delete_application }        from "../../../../../src/shared/database/managers/staff_application_manager"
import { connect }                    from "../../../../../src/shared/utils/database"

const __admin_secret = process.env.ADMIN_SECRET || "atomicals-admin"

/**
 * @route DELETE /api/staff-application/reset?id=DISCORD_ID&secret=SECRET
 * @description Admin endpoint to delete a specific user's application by discord ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const discord_id       = searchParams.get("id")
    const secret           = searchParams.get("secret")

    if (!secret || secret !== __admin_secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!discord_id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
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
