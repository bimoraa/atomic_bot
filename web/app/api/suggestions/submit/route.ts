import { NextRequest, NextResponse } from "next/server"
import { connect }                   from "@/lib/utils/database"
import {
  find_suggestion,
  update_suggestion,
}                                    from "@/lib/database/managers/suggestion.manager"
import type { suggestion_type }      from "@/lib/database/managers/suggestion.manager"

export const dynamic = 'force-dynamic'

const __discord_api  = "https://discord.com/api/v10"
const __bot_url      = process.env.NEXT_PUBLIC_BOT_URL || "https://atomicbot-production.up.railway.app"

/**
 * @route POST /api/suggestions/submit
 * @description Submit a suggestion form (called from web form)
 */
export async function POST(req: NextRequest) {
  try {
    await connect()

    const body = await req.json()

    const {
      token,
      suggest_type,
      game_name,
      game_id,
      game_image,
      feature_description,
      reason,
    } = body as {
      token               : string
      suggest_type        : suggestion_type
      game_name?          : string
      game_id?            : string
      game_image?         : string
      feature_description : string
      reason?             : string
    }

    if (!token || !suggest_type || !feature_description) {
      return NextResponse.json(
        { error: "Missing required fields: token, suggest_type, feature_description" },
        { status: 400 }
      )
    }

    if (!["add_game_support", "add_new_feature"].includes(suggest_type)) {
      return NextResponse.json(
        { error: "Invalid suggest_type" },
        { status: 400 }
      )
    }

    const suggestion = await find_suggestion(token)

    if (!suggestion) {
      return NextResponse.json(
        { error: "Invalid or expired suggestion token" },
        { status: 404 }
      )
    }

    if (suggestion.feature_description && suggestion.feature_description.length > 0) {
      return NextResponse.json(
        { error: "This suggestion has already been submitted" },
        { status: 400 }
      )
    }

    await update_suggestion(token, {
      suggest_type,
      game_name           : game_name || null,
      game_id             : game_id || null,
      game_image          : game_image || null,
      feature_description : feature_description.slice(0, 4000),
      reason              : reason?.slice(0, 2000) || null,
    })

    // - notify bot to post the suggestion to discord channel - \\
    try {
      await fetch(`${__bot_url}/api/suggestion/notify`, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ suggestion_id: token }),
      })
    } catch {
      console.error("[ - SUGGESTIONS SUBMIT - ] Failed to notify bot")
    }

    return NextResponse.json({ success: true, suggestion_id: token })
  } catch (error) {
    console.error("[ - SUGGESTIONS SUBMIT - ] Error:", error)
    return NextResponse.json(
      { error: "Failed to submit suggestion" },
      { status: 500 }
    )
  }
}
