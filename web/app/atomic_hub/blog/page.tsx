/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Metadata }       from "next"
import { BlogList }       from "@/components/features/blog/blog_list"
import type { BlogPostMeta } from "@/lib/blog"

// !!! metadata !!! \\

export const metadata: Metadata = {
  title      : "Blog — Atomic",
  description: "Development updates, system breakdowns, and engineering notes from the Atomic team.",
}

// !!! base URL + fetch helper !!! \\

const __base_url = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const __system_key = process.env.SYSTEM_API_KEY ?? ""

/**
 * @description fetches all blog post metadata from the internal API
 * @returns {Promise<BlogPostMeta[]>}
 */
async function fetch_all_posts(): Promise<BlogPostMeta[]> {
  try {
    const res = await fetch(`${__base_url}/api/blog`, {
      headers: { "x-system": __system_key },
      next   : { revalidate: 60 },
    })

    if (!res.ok) return []

    const json = await res.json() as { ok: boolean; posts: BlogPostMeta[] }
    return json.ok ? json.posts : []
  } catch {
    return []
  }
}

// !!! page !!! \\

export default async function BlogListPage() {
  const posts = await fetch_all_posts()

  return <BlogList posts={posts} />
}
