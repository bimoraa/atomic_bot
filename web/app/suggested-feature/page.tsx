/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useState }                                            from "react"
import Link                                                               from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }  from "@/components/ui/select"
import { MainTopbar }                                                      from "@/components/layout/main_topbar"
import { Loader2, ChevronUp, SlidersHorizontal, Plus }                    from "lucide-react"
import Image                                                               from "next/image"
import { cn }                                                              from "@/lib/utils"

interface suggestion_item {
  id                  : string
  user_id             : string
  suggest_type        : string
  game_name           : string | null
  game_image          : string | null
  feature_description : string
  reason              : string | null
  status              : string
  vote_count          : number
  created_at          : number
}

interface auth_user {
  id       : string
  username : string
  avatar?  : string
}

export default function SuggestedFeaturePage() {
  const [suggestions, set_suggestions] = useState<suggestion_item[]>([])
  const [loading, set_loading]         = useState(true)
  const [user, set_user]               = useState<auth_user | null>(null)
  const [voted_ids, set_voted_ids]     = useState<Set<string>>(new Set())
  const [voting_id, set_voting_id]     = useState<string | null>(null)
  const [sort_by, set_sort_by]         = useState<"votes" | "newest">("votes")
  const [filter_type, set_filter_type] = useState<"all" | "add_game_support" | "add_new_feature">("all")

  // - check auth - \\
  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) set_user(data.user)
      })
      .catch(() => {})
  }, [])

  // - fetch suggestions - \\
  useEffect(() => {
    set_loading(true)
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((data) => {
        const items = (data.suggestions || []).filter(
          (s: suggestion_item) => s.feature_description && s.feature_description.length > 0
        )
        set_suggestions(items)
      })
      .catch(() => {})
      .finally(() => set_loading(false))
  }, [])

  const handle_vote = async (suggestion_id: string) => {
    if (!user) {
      const return_to = encodeURIComponent(window.location.pathname)
      window.location.href = `/api/auth/discord?return_to=${return_to}`
      return
    }

    set_voting_id(suggestion_id)

    try {
      const res  = await fetch("/api/suggestions/vote", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ suggestion_id }),
      })
      const data = await res.json()

      if (data.success) {
        // - update local vote count - \\
        set_suggestions((prev) =>
          prev.map((s) =>
            s.id === suggestion_id ? { ...s, vote_count: data.vote_count } : s
          )
        )

        // - update voted set - \\
        set_voted_ids((prev) => {
          const next = new Set(prev)
          if (data.voted) {
            next.add(suggestion_id)
          } else {
            next.delete(suggestion_id)
          }
          return next
        })
      }
    } catch {
      // - silent fail - \\
    } finally {
      set_voting_id(null)
    }
  }

  const filtered = suggestions
    .filter((s) => filter_type === "all" || s.suggest_type === filter_type)
    .sort((a, b) => {
      if (sort_by === "votes") return b.vote_count - a.vote_count
      return b.created_at - a.created_at
    })

  const format_date = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year  : "numeric",
      month : "short",
      day   : "numeric",
    })
  }

  const type_label = (type: string) => {
    return type === "add_game_support" ? "Game Support" : "New Feature"
  }

  const status_badge = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "rejected": return "bg-red-500/10 text-red-400 border-red-500/20"
      default:         return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">

      {/* - purple ambient glow bottom-right - */}
      <div
        className="pointer-events-none fixed bottom-0 right-0 w-[520px] h-[520px] z-0"
        style={{
          background : "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.18) 0%, rgba(109, 40, 217, 0.07) 40%, transparent 70%)",
          filter     : "blur(32px)",
        }}
      />

      <MainTopbar user={user} />

      {/* - page content - */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-28 pb-16">

        {/* - page header — outside any frame - */}
        <div className="mb-10">
          <h1 className="text-3xl font-medium text-white" style={{ letterSpacing: "-0.2px" }}>Feature Suggestions</h1>
          <p className="text-sm font-normal text-white/40 mt-1.5" style={{ letterSpacing: "-0.2px" }}>
            Vote for features you want to see — top suggestions get prioritized
          </p>
        </div>

        {/* - toolbar - */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-white/30" />
            <Select value={sort_by} onValueChange={(v) => set_sort_by(v as "votes" | "newest")}>
              <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm text-white/70 focus:ring-0 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-white/[0.08] text-white/80">
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <Select value={filter_type} onValueChange={(v) => set_filter_type(v as "all" | "add_game_support" | "add_new_feature")}>
              <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm text-white/70 focus:ring-0 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-white/[0.08] text-white/80">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="add_game_support">Game Support</SelectItem>
                <SelectItem value="add_new_feature">New Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-white/25 ml-1">
            {filtered.length} suggestion{filtered.length !== 1 ? "s" : ""}
          </span>

          {user && (
            <Link
              href="/suggest-feature"
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-normal bg-white/[0.07] border border-white/[0.09] text-white/80 hover:bg-white/[0.11] hover:text-white transition-all duration-150"
            >
              <Plus className="h-3.5 w-3.5" />
              Suggest
            </Link>
          )}
        </div>

        {/* - list - */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-white/20" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-white/30 text-sm">No suggestions yet</p>
              {user && (
                <Link
                  href="/suggest-feature"
                  className="text-xs text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
                >
                  Be the first to suggest a feature
                </Link>
              )}
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="group flex gap-0 rounded-2xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.09] transition-all duration-200 overflow-hidden"
              >
                {/* - vote column - */}
                <button
                  onClick={() => handle_vote(s.id)}
                  disabled={voting_id === s.id}
                  className={cn(
                    "flex flex-col items-center justify-center px-5 py-5 border-r border-white/[0.05] min-w-[68px] transition-all duration-150 shrink-0",
                    voted_ids.has(s.id)
                      ? "bg-white/[0.05] text-white"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]",
                  )}
                >
                  {voting_id === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronUp
                      className={cn(
                        "h-5 w-5 transition-transform duration-150",
                        voted_ids.has(s.id) && "translate-y-[-1px]",
                      )}
                      strokeWidth={voted_ids.has(s.id) ? 2.5 : 2}
                    />
                  )}
                  <span className={cn(
                    "text-sm font-medium mt-0.5 tabular-nums",
                    voted_ids.has(s.id) ? "text-white" : "text-white/40",
                  )}>
                    {s.vote_count}
                  </span>
                </button>

                {/* - content - */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {s.game_image && (
                        <Image
                          src={s.game_image}
                          alt={s.game_name || "Game"}
                          width={36}
                          height={36}
                          className="rounded-lg border border-white/[0.07] shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.07] text-white/60 font-medium">
                            {type_label(s.suggest_type)}
                          </span>
                          <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-md border font-medium capitalize",
                            status_badge(s.status),
                          )}>
                            {s.status}
                          </span>
                        </div>
                        {s.game_name && (
                          <p className="text-sm font-medium text-white/90 mt-1 truncate">{s.game_name}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-white/25 whitespace-nowrap shrink-0 mt-0.5">
                      {format_date(s.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                    {s.feature_description.length > 280
                      ? s.feature_description.slice(0, 280) + "…"
                      : s.feature_description
                    }
                  </p>

                  {s.reason && (
                    <p className="text-xs text-white/30 mt-2 italic leading-relaxed">
                      {s.reason.length > 120 ? s.reason.slice(0, 120) + "…" : s.reason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* - login prompt if not authenticated - */}
        {!user && !loading && (
          <p className="text-center text-xs text-white/25 mt-10">
            <button
              onClick={() => {
                const return_to = encodeURIComponent(window.location.pathname)
                window.location.href = `/api/auth/discord?return_to=${return_to}`
              }}
              className="text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
            >
              Login with Discord
            </button>
            {" "}to vote or submit a suggestion
          </p>
        )}
      </div>
    </div>
  )
}
