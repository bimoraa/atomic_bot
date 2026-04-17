import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const __roblox_games_api      = "https://games.roblox.com/v1/games"
const __roblox_thumbnails_api = "https://thumbnails.roblox.com/v1/games/icons"
const __roblox_search_api     = "https://apis.roblox.com/search-api/omni-search"

/**
 * @route GET /api/suggestions/roblox?q=keyword
 * @description Proxy roblox game search to avoid CORS issues
 */
export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q")

    if (!query || query.length < 2) {
      return NextResponse.json({ games: [] })
    }

    // - search roblox games - \\
    const search_url = `${__roblox_search_api}?searchQuery=${encodeURIComponent(query)}&searchType=games&pageToken=&sessionId=`
    const search_res = await fetch(search_url, {
      headers: { "Accept": "application/json" },
    })

    if (!search_res.ok) {
      return NextResponse.json({ games: [] })
    }

    const search_data = await search_res.json()
    const search_items = search_data?.searchResults?.[0]?.contents || []

    const universe_ids = search_items
      .slice(0, 10)
      .map((item: any) => item.universeId)
      .filter(Boolean)

    if (universe_ids.length === 0) {
      return NextResponse.json({ games: [] })
    }

    // - fetch game details - \\
    const ids_param  = universe_ids.join(",")
    const games_res  = await fetch(`${__roblox_games_api}?universeIds=${ids_param}`)
    const games_data = games_res.ok ? await games_res.json() : { data: [] }

    // - fetch thumbnails - \\
    const thumbs_res  = await fetch(`${__roblox_thumbnails_api}?universeIds=${ids_param}&size=150x150&format=Png&isCircular=false`)
    const thumbs_data = thumbs_res.ok ? await thumbs_res.json() : { data: [] }

    const thumb_map = new Map<number, string>()
    for (const t of thumbs_data.data || []) {
      if (t.imageUrl) thumb_map.set(t.targetId, t.imageUrl)
    }

    const games = (games_data.data || []).map((game: any) => ({
      universe_id : game.id,
      name        : game.name,
      description : game.description?.slice(0, 200),
      image       : thumb_map.get(game.id) || null,
      playing     : game.playing,
      visits      : game.visits,
    }))

    return NextResponse.json({ games })
  } catch (error) {
    console.error("[ - ROBLOX PROXY - ] Error:", error)
    return NextResponse.json({ games: [] })
  }
}
