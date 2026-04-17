/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, Children, isValidElement } from "react"
import Link                                                                                                     from "next/link"
import ReactMarkdown                                                                                            from "react-markdown"
import remarkGfm                                                                                                from "remark-gfm"
import rehypeRaw                                                                                                from "rehype-raw"
import { cn }                                                                                                   from "@/lib/utils"
import { AtomicLogo }                                                                                           from "@/components/icons/atomic_logo"
import { CalendarMinimalistic, ClockCircle, Tag, AltArrowLeft }                                                 from "@solar-icons/react"
import { Maximize, Minimize }                                                                                   from "lucide-react"
import type { BlogPost as BlogPostData }                                                                        from "@/lib/blog"

// !!! mermaid singleton — initialize once, reuse !!! \\

let __mermaid_ready = false

async function get_mermaid() {
  const mermaid = (await import("mermaid")).default

  if (!__mermaid_ready) {
    __mermaid_ready = true
    mermaid.initialize({
      startOnLoad : false,
      theme       : "dark",
      themeVariables: {
        primaryColor        : "#5865F2",
        primaryTextColor    : "#e5e5e5",
        primaryBorderColor  : "#3d3d4d",
        lineColor           : "#3d3d4d",
        background          : "#0d0d11",
        mainBkg             : "#111116",
        nodeBorder          : "#2a2a35",
        clusterBkg          : "#0d0d11",
        edgeLabelBackground : "#111116",
        fontSize            : "13px",
        fontFamily          : "inherit",
      },
      flowchart: {
        htmlLabels : true,
        curve      : "basis",
        padding    : 20,
      },
    })
  }

  return mermaid
}

// !!! mermaid block renderer — client-side only !!! \\

function MermaidBlock({ chart }: { chart: string }) {
  const render_ref               = useRef<HTMLDivElement>(null)
  const pan_ref                  = useRef<HTMLDivElement>(null)
  const [ready, set_ready]       = useState(false)
  const [expanded, set_expanded] = useState(false)

  // - pan/zoom stored in refs — no re-renders during gesture - \\
  const scale_ref    = useRef(1)
  const origin_ref   = useRef({ x: 0, y: 0 })
  const is_dragging  = useRef(false)
  const drag_start   = useRef({ x: 0, y: 0 })

  function apply_transform() {
    if (!pan_ref.current) return
    pan_ref.current.style.transform = `translate(${origin_ref.current.x}px, ${origin_ref.current.y}px) scale(${scale_ref.current})`
  }

  function reset_transform() {
    scale_ref.current  = 1
    origin_ref.current = { x: 0, y: 0 }
    apply_transform()
  }

  // - block scroll when expanded - \\
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : ""
    if (!expanded) reset_transform()
    return () => { document.body.style.overflow = "" }
  }, [expanded])

  function on_wheel(e: React.WheelEvent) {
    if (!expanded) return
    e.preventDefault()
    const delta      = e.deltaY > 0 ? 0.9 : 1.1
    scale_ref.current = Math.min(6, Math.max(0.25, scale_ref.current * delta))
    apply_transform()
  }

  function on_mouse_down(e: React.MouseEvent) {
    if (!expanded) return
    is_dragging.current = true
    drag_start.current  = {
      x: e.clientX - origin_ref.current.x,
      y: e.clientY - origin_ref.current.y,
    }
  }

  function on_mouse_move(e: React.MouseEvent) {
    if (!expanded || !is_dragging.current) return
    origin_ref.current = {
      x: e.clientX - drag_start.current.x,
      y: e.clientY - drag_start.current.y,
    }
    apply_transform()
  }

  function on_pointer_up() { is_dragging.current = false }

  // - render mermaid SVG once - \\
  useEffect(() => {
    let cancelled = false

    async function render() {
      const render_id = `mmd-${Math.random().toString(36).slice(2, 9)}`

      try {
        const mermaid = await get_mermaid()
        if (cancelled || !render_ref.current) return

        const { svg } = await mermaid.render(render_id, chart.trim())
        if (!cancelled && render_ref.current) {
          render_ref.current.innerHTML = svg
          set_ready(true)
        }
      } catch {
        if (!cancelled && render_ref.current) {
          render_ref.current.innerHTML = `<p style="color:#f87171;font-size:13px;padding:8px">Failed to render chart</p>`
          set_ready(true)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  return (
    <>
      {/* - backdrop — plain dark, no blur for perf - */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9998] bg-black/75"
          onClick={() => set_expanded(false)}
        />
      )}

      <div
        className={cn(
          "group relative my-8 rounded-xl border bg-[#0d0d11] overflow-hidden",
          expanded
            ? "fixed z-[9999] top-[5%] left-[12%] right-[12%] bottom-[5%] rounded-2xl border-white/[0.10] shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
            : "border-white/[0.07] min-h-[120px]",
        )}
      >
        {/* - expand button - */}
        <button
          onClick={() => set_expanded(!expanded)}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-md transition-opacity z-10",
            expanded
              ? "bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white opacity-100"
              : "bg-white/[0.03] text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100",
          )}
        >
          {expanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* - pan / zoom container - */}
        <div
          className={cn(
            "w-full h-full select-none",
            expanded ? "cursor-grab active:cursor-grabbing overflow-hidden" : "overflow-x-auto",
          )}
          onWheel={on_wheel}
          onMouseDown={on_mouse_down}
          onMouseMove={on_mouse_move}
          onMouseUp={on_pointer_up}
          onMouseLeave={on_pointer_up}
        >
          <div
            ref={pan_ref}
            style={{ transformOrigin: "center center", willChange: "transform" }}
            className={cn(
              expanded
                ? "min-h-full min-w-full flex items-center justify-center p-12"
                : "p-6 flex items-center justify-center",
            )}
          >
            <div
              ref={render_ref}
              className={cn(
                "transition-opacity duration-300 [&>svg]:inline-block [&>svg]:max-w-none",
                ready ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>

        {/* - hint when expanded - */}
        {expanded && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/20 pointer-events-none select-none whitespace-nowrap">
            scroll to zoom · drag to pan · click outside to close
          </div>
        )}
      </div>
    </>
  )
}

// !!! inline code component !!! \\

function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="rounded-md border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.82em] text-[#c9d1d9]">
      {children}
    </code>
  )
}

// !!! main blog post component !!! \\

interface Props {
  post: BlogPostData
}

export function BlogPost({ post }: Props) {
  const { meta, content } = post

  const [scrolled, set_scrolled] = useState(false)

  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 16)
    window.addEventListener("scroll", on_scroll, { passive: true })
    return () => window.removeEventListener("scroll", on_scroll)
  }, [])

  return (
    <div
      className="min-h-screen bg-[#060608] selection:bg-[#5865F2]/20"
      style={{ letterSpacing: "-0.2px" }}
    >
      {/* !!! topbar !!! */}
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
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AtomicLogo className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/50 font-medium">Atomic</span>
              <span className="text-[#2a2a2e] text-xs mx-0.5">/</span>
              <span className="text-sm text-white/30 font-medium hidden sm:inline">Blog</span>
            </Link>

            <Link
              href="/atomic_hub/blog"
              className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white/60 transition-colors"
            >
              <AltArrowLeft className="w-3.5 h-3.5" />
              All Posts
            </Link>
          </nav>
        </div>
      </header>

      {/* !!! article !!! */}
      <article className="max-w-2xl mx-auto px-5 pt-28 lg:pt-36 pb-28">

        {/* - article header - */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5865F2]/25 bg-[#5865F2]/8 px-2.5 py-0.5 text-[0.72rem] font-medium text-[#8b92f8]">
              <Tag className="w-3 h-3" />
              {meta.category}
            </span>
            <span className="text-[#383838] text-xs">{meta.tag}</span>
          </div>

          <h1
            className="text-[2rem] sm:text-[2.5rem] font-medium leading-[1.18] text-white/92 mb-7"
            style={{ letterSpacing: "-0.2px" }}
          >
            {meta.title}
          </h1>

          <p className="text-[#666] leading-relaxed mb-8 text-[0.94rem]">
            {meta.description}
          </p>
        </header>

        {/* - article body - */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // - headings - \\
            h2: ({ children }) => (
              <h2
                className="text-[1.25rem] font-medium text-white/85 mt-14 mb-4 first:mt-0"
                style={{ letterSpacing: "-0.2px" }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                className="text-[1.05rem] font-medium text-white/75 mt-10 mb-3"
                style={{ letterSpacing: "-0.2px" }}
              >
                {children}
              </h3>
            ),
            // - paragraph - \\
            p: ({ children }) => (
              <p className="text-[#666] leading-[1.78] mb-5 text-[0.92rem]">
                {children}
              </p>
            ),
            // - strong — override bold to medium + lighter color - \\
            strong: ({ children }) => (
              <span className="font-medium text-[#999]">{children}</span>
            ),
            // - pre wrapper: intercept mermaid by reading child props.className directly - \\
            // - NOTE: child.type is our code override function, not string "code" — must check props - \\
            pre: ({ children }) => {
              const kids = Children.toArray(children)
              for (const child of kids) {
                if (isValidElement(child)) {
                  const cls = (child.props as { className?: string }).className ?? ""
                  if (/language-mermaid/.test(cls)) {
                    const raw_content = (child.props as { children?: unknown }).children
                    const chart = String(
                      Array.isArray(raw_content) ? raw_content.join("") : raw_content ?? ""
                    ).trim()
                    return <MermaidBlock chart={chart} />
                  }
                }
              }
              // - regular fenced code block - \\
              return (
                <pre className="rounded-xl border border-white/[0.07] bg-[#0d0d11] p-4 my-6 overflow-x-auto">
                  {children}
                </pre>
              )
            },
            // - inline code only (block code is handled by pre above) - \\
            code: ({ className, children, ...props }) => {
              if (className) {
                // - block code inside pre - \\
                return (
                  <code
                    className={cn("font-mono text-sm text-[#c9d1d9]", className)}
                    {...(props as ComponentPropsWithoutRef<"code">)}
                  >
                    {children}
                  </code>
                )
              }
              return <InlineCode>{children}</InlineCode>
            },
            // - blockquote - \\
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[#5865F2]/40 pl-4 my-6 text-[#555] italic">
                {children}
              </blockquote>
            ),
            // - horizontal rule - \\
            hr: () => <div className="h-px bg-white/[0.04] my-10" />,
            // - lists - \\
            ul: ({ children }) => (
              <ul className="list-none pl-0 my-5 space-y-2">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-none pl-0 my-5 space-y-2 counter-reset-[item]">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="flex items-baseline gap-3 text-[#666] text-[0.92rem] leading-relaxed">
                <span className="text-[#3d3d4d] shrink-0 select-none">-</span>
                <span>{children}</span>
              </li>
            ),
            // - table - \\
            table: ({ children }) => (
              <div className="my-7 overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-[0.875rem] border-collapse">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-white/[0.03]">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-white/[0.04]">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="transition-colors hover:bg-white/[0.02]">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-xs font-medium text-white/30 border-b border-white/[0.06]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-[#666] align-top">
                {children}
              </td>
            ),
            // - links - \\
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-[#8b92f8] underline underline-offset-2 decoration-[#5865F2]/30 hover:decoration-[#5865F2] transition-colors"
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>

        {/* - author and metadata row — at bottom of article - */}
        <hr className="w-full border-t border-white/[0.08] my-16" />
        <div className="pb-16 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            
            <div className="flex items-center gap-2.5">
              {meta.avatar ? (
                <img
                  src={meta.avatar}
                  alt={meta.author}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-white/[0.08] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#111116] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <AtomicLogo className="w-4 h-4 text-white/50" />
                </div>
              )}
              <span className="text-sm text-[#888] font-medium">{meta.author}</span>
            </div>
            
            <div className="flex items-center gap-5 text-xs text-[#555]">
              <div className="flex items-center gap-1.5">
                <CalendarMinimalistic className="w-3.5 h-3.5" />
                <span>{meta.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockCircle className="w-3.5 h-3.5" />
                <span>{meta.readTime}</span>
              </div>
            </div>

        </div>
      </article>

      {/* !!! purple blur gradients !!! */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {/* - top center - */}
        <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[360px] h-[220px] rounded-full bg-[#5865F2]/[0.07] blur-3xl" />
        {/* - bottom center - */}
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[420px] h-[260px] rounded-full bg-[#9333ea]/[0.09] blur-3xl" />
      </div>
    </div>
  )
}
