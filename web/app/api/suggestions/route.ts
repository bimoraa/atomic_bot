import { NextRequest, NextResponse } from "next/server"
import { connect }                   from "@/lib/utils/database"
import {
  find_all_suggestions,
  get_vote_count,
}                                    from "@/lib/database/managers/suggestion.manager"

export const dynamic = 'force-dynamic'

/**
 * @route GET /api/suggestions
 * @description Get all feature suggestions with vote counts
 */
export async function GET(_req: NextRequest) {
  try {
    await connect()

    const suggestions = await find_all_suggestions()

    const results = await Promise.all(
      suggestions.map(async (s) => ({
        ...s,
        vote_count: await get_vote_count(s.id),
      }))
    )

    // - sort by vote count desc, then by created_at desc - \\
    results.sort((a, b) => b.vote_count - a.vote_count || b.created_at - a.created_at)

    return NextResponse.json({ suggestions: results })
  } catch (error) {
    console.error("[ - SUGGESTIONS API - ] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
}
