/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { NextRequest, NextResponse } from "next/server"
import { get_all_blog_posts }        from "@/lib/blog"

// !!! GET /api/blog — list all posts metadata !!! \\

/**
 * @description Returns all blog post metadata. Requires x-system header.
 * @param {NextRequest} req - incoming request
 * @returns {NextResponse} JSON list of blog post metadata or error
 */
export async function GET(req: NextRequest) {
  // - validate system header (skipped if SYSTEM_API_KEY not configured) - \\
  const expected = process.env.SYSTEM_API_KEY

  if (expected) {
    const system_key = req.headers.get("x-system")
    if (!system_key || system_key !== expected) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing or invalid x-system header." },
        { status: 401 },
      )
    }
  }

  const posts = await get_all_blog_posts()

  return NextResponse.json(
    { ok: true, posts },
    {
      status : 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  )
}
