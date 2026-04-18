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
import { get_blog_post, get_all_blog_posts } from "@/lib/blog"
import type { BlogPost as BlogPostData } from "@/lib/blog"

// !!! static params — pre-generate all blog post routes !!! \\

export async function generateStaticParams() {
  const posts = await get_all_blog_posts()
  return posts.map(post => ({ uuid: post.uuid }))
}

// !!! metadata !!! \\

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>
}): Promise<Metadata> {
  const { uuid } = await params
  const post     = await get_blog_post(uuid)

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
  const post     = await get_blog_post(uuid)

  if (!post) notFound()

  return <BlogPost post={post} />
}

