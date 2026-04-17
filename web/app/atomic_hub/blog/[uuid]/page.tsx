/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Metadata }  from "next"
import { notFound }  from "next/navigation"
import { BlogPost }  from "@/components/features/blog/blog_post"
import type { BlogPost as BlogPostData, BlogPostMeta } from "@/lib/blog"

// !!! base URL for internal API calls !!! \\

const __base_url = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const __system_key = process.env.SYSTEM_API_KEY ?? ""

// !!! shared fetch helper !!! \\

/**
 * @description fetches a blog post from the internal API
 * @param {string} uuid - blog post UUID
 * @returns {Promise<BlogPostData | null>}
 */
async function fetch_blog_post(uuid: string): Promise<BlogPostData | null> {
  try {
    const res = await fetch(`${__base_url}/api/blog/${uuid}`, {
      headers: { "x-system": __system_key },
      next   : { revalidate: 60 },
    })

    if (!res.ok) return null

    const json = await res.json() as { ok: boolean; post: BlogPostData }
    return json.ok ? json.post : null
  } catch {
    return null
  }
}

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

// !!! static params — pre-generate all blog post routes !!! \\

export async function generateStaticParams() {
  const posts = await fetch_all_posts()
  return posts.map(post => ({ uuid: post.uuid }))
}

// !!! metadata !!! \\

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>
}): Promise<Metadata> {
  const { uuid } = await params
  const post     = await fetch_blog_post(uuid)

  if (!post) return { title: "Not Found" }

  return {
    title      : `${post.meta.title} — Atomic`,
    description: post.meta.description,
  }
}

// !!! page !!! \\

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  const post     = await fetch_blog_post(uuid)

  if (!post) notFound()

  return <BlogPost post={post} />
}

