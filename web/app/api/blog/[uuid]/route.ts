/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { NextRequest, NextResponse } from "next/server"
import { get_blog_post }             from "@/lib/blog"

// !!! GET /api/blog/[uuid] !!! \\

/**
 * @description Returns a blog post by UUID. Requires x-system header for access.
 * @param {NextRequest} req  - incoming request
 * @param {{ params: { uuid: string } }} context - route params
 * @returns {NextResponse} JSON blog post or error response
 */
export async function GET(
  req      : NextRequest,
  context  : { params: Promise<{ uuid: string }> },
) {
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

  const { uuid } = await context.params

  if (!uuid || typeof uuid !== "string") {
    return NextResponse.json(
      { error: "Bad Request", message: "UUID is required." },
      { status: 400 },
    )
  }

  const post = await get_blog_post(uuid)

  if (!post) {
    return NextResponse.json(
      { error: "Not Found", message: `No blog post found with UUID: ${uuid}` },
      { status: 404 },
    )
  }

  return NextResponse.json(
    { ok: true, post },
    {
      status : 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  )
}
