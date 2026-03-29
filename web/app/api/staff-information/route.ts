import { NextRequest, NextResponse }                          from "next/server"
import { decrypt_session }                                   from "@/lib/utils/session"
import { connect }                                           from "@/lib/utils/database"
import { get_all_tabs, save_all_tabs, save_tabs_payload }   from "@/lib/database/managers/staff_information.manager"

const __bot_url             = process.env.NEXT_PUBLIC_BOT_URL || "https://atomicbot-production.up.railway.app"
const __allowed_developer_id = "1118453649727823974"
const __min_position         = 112

async function check_rdom_auth(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get("discord_user")
  if (!cookie) return false

  const user = await decrypt_session(cookie.value)
  if (!user) return false

  if (user.id === __allowed_developer_id) return true

  const res = await fetch(`${__bot_url}/api/member/${user.id}`).catch(() => null)
  if (!res?.ok) return false

  const member_data = await res.json()
  return member_data.roles?.some((r: any) => r.position >= __min_position) ?? false
}

/**
 * @route GET /api/staff-information
 * @description Returns all tabs with sections (requires any auth)
 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("discord_user")
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await decrypt_session(cookie.value)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connect()
    const tabs = await get_all_tabs()
    return NextResponse.json({ tabs })
  } catch (error) {
    console.error("[ - STAFF INFO GET - ] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * @route PATCH /api/staff-information
 * @description Replace all tabs and sections (RDOM only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const is_authorized = await check_rdom_auth(req)
    if (!is_authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body: save_tabs_payload = await req.json()

    if (!body.tabs || !Array.isArray(body.tabs)) {
      return NextResponse.json({ error: "Invalid payload: tabs array required" }, { status: 400 })
    }

    for (const tab of body.tabs) {
      if (!tab.title?.trim()) {
        return NextResponse.json({ error: "All tabs must have a title" }, { status: 400 })
      }
      if (!Array.isArray(tab.sections)) {
        return NextResponse.json({ error: "All tabs must have a sections array" }, { status: 400 })
      }
      for (const section of tab.sections) {
        if (!section.title?.trim()) {
          return NextResponse.json({ error: "All sections must have a title" }, { status: 400 })
        }
      }
    }

    await connect()
    await save_all_tabs(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[ - STAFF INFO PATCH - ] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
