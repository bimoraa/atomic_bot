import { NextRequest, NextResponse } from "next/server"
import { connect }                   from "@/lib/utils/database"
import { decrypt_session }           from "@/lib/utils/session"
import {
  find_suggestion,
  has_voted,
  upsert_vote,
  remove_vote,
  get_vote_count,
}                                    from "@/lib/database/managers/suggestion.manager"

export const dynamic = 'force-dynamic'

const __bot_url = process.env.NEXT_PUBLIC_BOT_URL || "https://atomicbot-production.up.railway.app"

/**
 * @route POST /api/suggestions/vote
 * @description Toggle vote on a suggestion (requires Discord auth)
 */
export async function POST(req: NextRequest) {
  try {
    // - verify auth - \\
    const discord_user_cookie = req.cookies.get("discord_user")

    if (!discord_user_cookie) {
      return NextResponse.json(
        { error: "Authentication required. Please login with Discord." },
        { status: 401 }
      )
    }

    const user = await decrypt_session(discord_user_cookie.value)

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Invalid session. Please login again." },
        { status: 401 }
      )
    }

    await connect()

    const body = await req.json()
    const { suggestion_id } = body as { suggestion_id: string }

    if (!suggestion_id) {
      return NextResponse.json(
        { error: "Missing suggestion_id" },
        { status: 400 }
      )
    }

    const suggestion = await find_suggestion(suggestion_id)

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      )
    }

    const already_voted = await has_voted(suggestion_id, user.id)

    if (already_voted) {
      await remove_vote(suggestion_id, user.id)
    } else {
      await upsert_vote(suggestion_id, user.id, "web")
    }

    const vote_count = await get_vote_count(suggestion_id)

    // - notify bot to update discord message vote count - \\
    try {
      await fetch(`${__bot_url}/api/suggestion/vote-sync`, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ suggestion_id, vote_count }),
      })
    } catch {
      console.error("[ - SUGGESTIONS VOTE - ] Failed to sync vote to bot")
    }

    return NextResponse.json({
      success    : true,
      voted      : !already_voted,
      vote_count,
    })
  } catch (error) {
    console.error("[ - SUGGESTIONS VOTE - ] Error:", error)
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    )
  }
}
