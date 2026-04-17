/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useState, useMemo, useEffect }                        from "react"
import Link                                                    from "next/link"
import { cn }                                                  from "@/lib/utils"
import { AtomicLogo }                                          from "@/components/icons/atomic_logo"
import { CalendarMinimalistic, ClockCircle }                   from "@solar-icons/react"
import { BlogSearch }                                          from "@/components/features/blog/blog_search"
import type { BlogPostMeta }                                   from "@/lib/blog"

// !!! blog list — client component (solar icons require context) !!! \\

interface BlogListProps {
  posts: BlogPostMeta[]
}

/**
 * @description renders the full blog list UI with search and post cards
 * @param {BlogListProps} props - list of blog post metadata
 * @returns {JSX.Element}
 */
export function BlogList({ posts }: BlogListProps) {
  const [query,    set_query]    = useState("")
  const [scrolled, set_scrolled] = useState(false)

  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 16)
    window.addEventListener("scroll", on_scroll, { passive: true })
    return () => window.removeEventListener("scroll", on_scroll)
  }, [])

  // - filter posts by title, description, author - \\
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return posts
    return posts.filter(p =>
      p.title.toLowerCase().includes(q)       ||
      p.description.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q),
    )
  }, [query, posts])

  return (
    <div
      className="min-h-screen bg-[#060608] text-white"
      style={{ letterSpacing: "-0.2px" }}
    >

      {/* - top blur gradient - */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-15 blur-3xl rounded-full z-0"
        style={{ background: "radial-gradient(ellipse, #5865F2 0%, transparent 70%)" }}
      />

      {/* - topbar — same floating pill style as blog_post - */}
      <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-300", scrolled ? "py-2" : "py-4")}>
        <div className="max-w-3xl mx-auto px-5">
          <nav
            className={cn(
              "flex items-center justify-between px-4 h-11 rounded-2xl border transition-all duration-300",
              scrolled
                ? "bg-[#0c0c0e]/90 border-white/[0.07] backdrop-blur-xl"
                : "bg-[#0c0c0e]/60 border-white/[0.05] backdrop-blur-md",
            )}
          >
            {/* - logo breadcrumb - */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AtomicLogo className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/50 font-medium">Atomic</span>
              <span className="text-[#2a2a2e] text-xs mx-0.5">/</span>
              <span className="text-sm text-white/30 font-medium">Blog</span>
            </Link>

            {/* - custom search — ssr-safe, no external deps - */}
            <BlogSearch
              placeholder="Search posts..."
              expandedWidth={200}
              onValueChange={set_query}
            />
          </nav>
        </div>
      </header>

      {/* - page content - */}
      <main className="max-w-2xl mx-auto px-5 pt-28 lg:pt-36 pb-28 relative z-10">

        {/* - page heading - */}
        <div className="mb-12">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <h1
              className="text-[2rem] sm:text-[2.4rem] font-medium text-white/90"
              style={{ letterSpacing: "-0.3px" }}
            >
              Engineering Blog
            </h1>
            <span className="text-xs text-[#2e2e38] shrink-0 tabular-nums">
              {filtered.length} {filtered.length === 1 ? "post" : "posts"}
            </span>
          </div>
          <p className="text-[#444] text-[0.88rem]">
            Development updates and system breakdowns from the Atomic team.
          </p>
        </div>

        {/* - post list - */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#2e2e38] text-sm">
              {query ? `No posts matching "${query}"` : "No posts yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {filtered.map(post => (
              <Link
                key={post.uuid}
                href={`/atomic_hub/blog/${post.uuid}`}
                className="group flex gap-4 py-6 first:pt-0 hover:opacity-75 transition-opacity"
              >
                {/* - author avatar - */}
                <div className="shrink-0 pt-0.5">
                  {post.avatar ? (
                    <img
                      src={post.avatar}
                      alt={post.author}
                      className="w-7 h-7 rounded-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/15 flex items-center justify-center">
                      <AtomicLogo className="w-3 h-3 text-[#8b92f8]/50" />
                    </div>
                  )}
                </div>

                {/* - content - */}
                <div className="flex-1 min-w-0">

                  {/* - title - */}
                  <h2
                    className="text-[0.96rem] font-medium text-white/65 group-hover:text-white/85 transition-colors mb-1.5 leading-snug"
                    style={{ letterSpacing: "-0.1px" }}
                  >
                    {post.title}
                  </h2>

                  {/* - description - */}
                  <p className="text-[#333340] text-[0.82rem] leading-relaxed mb-3 line-clamp-2">
                    {post.description}
                  </p>

                  {/* - meta - */}
                  <div className="flex items-center gap-3 text-[0.7rem] text-[#2a2a35]">
                    <span className="flex items-center gap-1">
                      <CalendarMinimalistic className="w-2.5 h-2.5" />
                      {post.date}
                    </span>
                    <span className="text-[#1e1e24]">·</span>
                    <span className="flex items-center gap-1">
                      <ClockCircle className="w-2.5 h-2.5" />
                      {post.readTime}
                    </span>
                    {post.author && (
                      <>
                        <span className="text-[#1e1e24]">·</span>
                        <span>{post.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
