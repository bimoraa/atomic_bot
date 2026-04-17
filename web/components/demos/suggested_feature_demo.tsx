/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useState }                                                                                        from "react"
import Link                                                                                                from "next/link"
import Image                                                                                               from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }                                  from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle }                                               from "@/components/ui/dialog"
import { MainTopbar }                                                                                      from "@/components/layout/main_topbar"
import { AltArrowUp, Filter, AddCircle, CalendarMinimalistic, User, ChatLine, Lightbulb } from "@solar-icons/react"
import { cn }                                                                                              from "@/lib/utils"

// - demo user (simulates logged-in state) - \\
const __demo_user = {
  id         : "123456789",
  username   : "demouser",
  avatar     : undefined as string | undefined,
  avatar_url : "/gyj.jpeg",
}

// - shared demo game image (blox fruits thumbnail) - \\
const __game_img = "https://tr.rbxcdn.com/180DAY-af4eed326351cb513869c431e3d88787/256/256/Image/Webp/noFilter"

// - static demo seed data (roblox game suggestions) - \\
const __demo_suggestions = [
  {
    id                  : "demo-1",
    suggest_type        : "add_new_feature",
    game_name           : "game title",
    game_image          : __game_img,
    feature_description : "game description lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores, voluptate.",
    reason              : "reason for suggestion lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores, voluptate.",
    status              : "approved",
    vote_count          : 1,
    created_at          : 1744819200,
    voted               : true,
    submitted_by        : "bimoraa",
  },
]

const __status_badge = (status: string) => {
  switch (status) {
    case "approved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "rejected": return "bg-red-500/10 text-red-400 border-red-500/20"
    default:         return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  }
}

const __status_label = (status: string) => {
  switch (status) {
    case "approved": return "Approved"
    case "rejected": return "Rejected"
    default        : return "Pending Review"
  }
}

const __type_label = (type: string) =>
  type === "add_game_support" ? "Game Support" : "New Feature"

const __format_date = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString("en-US", {
    year  : "numeric",
    month : "short",
    day   : "numeric",
  })

type suggestion_item = typeof __demo_suggestions[number]

/**
 * @description Full-fidelity design demo of the Feature Suggestions page with static Roblox game data, interactive voting, and detail modal
 * @returns JSX element
 */
export function SuggestedFeatureDemo() {
  const [sort_by, set_sort_by]         = useState<"votes" | "newest">("votes")
  const [filter_type, set_filter_type] = useState<"all" | "add_game_support" | "add_new_feature">("all")
  const [selected, set_selected]       = useState<suggestion_item | null>(null)
  const [votes, set_votes]             = useState<Record<string, { count: number; voted: boolean }>>(() => {
    const init: Record<string, { count: number; voted: boolean }> = {}
    for (const s of __demo_suggestions) {
      init[s.id] = { count: s.vote_count, voted: s.voted }
    }
    return init
  })

  const toggle_vote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    set_votes((prev) => {
      const cur = prev[id]
      return {
        ...prev,
        [id]: {
          count : cur.voted ? cur.count - 1 : cur.count + 1,
          voted : !cur.voted,
        },
      }
    })
  }

  const filtered = __demo_suggestions
    .filter((s) => filter_type === "all" || s.suggest_type === filter_type)
    .sort((a, b) => {
      if (sort_by === "votes") return votes[b.id].count - votes[a.id].count
      return b.created_at - a.created_at
    })

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

      <MainTopbar user={__demo_user} />

      {/* - page content - */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-28 pb-16">

        {/* - page header - */}
        <div className="mb-10">
          <h1
            className="text-3xl font-medium text-white"
            style={{ letterSpacing: "-0.2px" }}
          >
            Feature Suggestions
          </h1>
          <p
            className="text-sm font-normal text-white/40 mt-1.5"
            style={{ letterSpacing: "-0.2px" }}
          >
            Vote for features you want to see — top suggestions get prioritized
          </p>
        </div>

        {/* - toolbar - */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-white/30" />
            <Select value={sort_by} onValueChange={(v) => set_sort_by(v as "votes" | "newest")}>
              <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm text-white/70 focus:ring-0 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-white/[0.08] text-white/80">
                <SelectItem value="votes" style={{ letterSpacing: "-0.2px" }}>Most Votes</SelectItem>
                <SelectItem value="newest" style={{ letterSpacing: "-0.2px" }}>Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <Select value={filter_type} onValueChange={(v) => set_filter_type(v as "all" | "add_game_support" | "add_new_feature")}>
              <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm text-white/70 focus:ring-0 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-white/[0.08] text-white/80">
                <SelectItem value="all" style={{ letterSpacing: "-0.2px" }}>All Types</SelectItem>
                <SelectItem value="add_game_support" style={{ letterSpacing: "-0.2px" }}>Game Support</SelectItem>
                <SelectItem value="add_new_feature" style={{ letterSpacing: "-0.2px" }}>New Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-white/25 ml-1" style={{ letterSpacing: "-0.2px" }}>
            {filtered.length} suggestion{filtered.length !== 1 ? "s" : ""}
          </span>

          <Link
            href="/suggest-feature"
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-normal bg-white/[0.07] border border-white/[0.09] text-white/80 hover:bg-white/[0.11] hover:text-white transition-all duration-150"
            style={{ letterSpacing: "-0.2px" }}
          >
            <AddCircle className="h-3.5 w-3.5" />
            Suggest
          </Link>
        </div>

        {/* - suggestion cards - */}
        <div className="space-y-3">
          {filtered.map((s) => {
            const vote_state = votes[s.id]
            return (
              <div
                key={s.id}
                onClick={() => set_selected(s)}
                className="group flex gap-0 rounded-2xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.09] transition-all duration-200 overflow-hidden cursor-pointer"
              >
                {/* - vote column - */}
                <button
                  onClick={(e) => toggle_vote(s.id, e)}
                  className={cn(
                    "flex flex-col items-center justify-center px-5 py-5 border-r border-white/[0.05] min-w-[68px] transition-all duration-150 shrink-0",
                    vote_state.voted
                      ? "bg-white/[0.05] text-white"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]",
                  )}
                >
                  <AltArrowUp
                    className={cn(
                      "h-5 w-5 transition-transform duration-150",
                      vote_state.voted && "translate-y-[-1px]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium mt-0.5 tabular-nums",
                      vote_state.voted ? "text-white" : "text-white/40",
                    )}
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {vote_state.count}
                  </span>
                </button>

                {/* - content - */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">

                      <Image
                        src={s.game_image}
                        alt={s.game_name}
                        width={36}
                        height={36}
                        className="rounded-lg border border-white/[0.07] shrink-0"
                      />

                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-white/90 truncate"
                          style={{ letterSpacing: "-0.2px" }}
                        >
                          {s.game_name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.07] text-white/60 font-medium"
                            style={{ letterSpacing: "-0.2px" }}
                          >
                            {__type_label(s.suggest_type)}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-md border font-medium capitalize",
                              __status_badge(s.status),
                            )}
                            style={{ letterSpacing: "-0.2px" }}
                          >
                            {s.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[11px] text-white/25 whitespace-nowrap shrink-0 mt-0.5"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      {__format_date(s.created_at)}
                    </span>
                  </div>

                  <p
                    className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {s.feature_description.length > 280
                      ? s.feature_description.slice(0, 280) + "…"
                      : s.feature_description
                    }
                  </p>

                  {/* - submitted by - */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <Image
                      src="/gyj.jpeg"
                      alt={s.submitted_by}
                      width={16}
                      height={16}
                      className="rounded-full border border-white/10 object-cover shrink-0"
                    />
                    <span
                      className="text-[11px] text-white/30"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      {s.submitted_by}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* - detail modal - */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && set_selected(null)}>
        <DialogContent className="bg-[#111113] border border-white/[0.08] text-white p-0 max-w-lg rounded-2xl overflow-hidden gap-0">

          {/* - modal header - */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <DialogTitle
              className="text-base font-medium text-white"
              style={{ letterSpacing: "-0.2px" }}
            >
              Suggestion Detail
            </DialogTitle>
            {selected && (
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span
                  className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.07] text-white/60 font-medium"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {__type_label(selected.suggest_type)}
                </span>
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-md border font-medium",
                    __status_badge(selected.status),
                  )}
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {__status_label(selected.status)}
                </span>
              </div>
            )}
          </DialogHeader>

          {selected && (
            <div className="px-5 py-4 space-y-4">

              {/* - game info - */}
              <div className="flex items-center gap-3">
                <Image
                  src={selected.game_image}
                  alt={selected.game_name}
                  width={56}
                  height={56}
                  className="rounded-xl border border-white/[0.07] shrink-0 object-cover"
                />
                <div>
                  <p
                    className="text-[11px] text-white/35 font-medium"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    Game
                  </p>
                  <p
                    className="text-sm font-medium text-white/90"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {selected.game_name}
                  </p>
                </div>
              </div>

              {/* - description - */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ChatLine className="h-3.5 w-3.5 text-white/25" />
                  <span
                    className="text-[11px] text-white/35 font-medium"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    Description
                  </span>
                </div>
                <p
                  className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap pl-5"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {selected.feature_description}
                </p>
              </div>

              {/* - reason - */}
              {selected.reason && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-white/25" size={14} />
                    <span
                      className="text-[11px] text-white/35 font-medium"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      Reason
                    </span>
                  </div>
                  <p
                    className="text-sm text-white/50 leading-relaxed italic pl-5"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {selected.reason}
                  </p>
                </div>
              )}

              {/* - divider - */}
              <div className="border-t border-white/[0.05]" />

              {/* - meta row: submitted by + date + votes - */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-white/25" size={12} />
                    <span
                      className="text-[10px] text-white/30 font-medium"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      Submitted by
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Image
                      src="/gyj.jpeg"
                      alt={selected.submitted_by}
                      width={16}
                      height={16}
                      className="rounded-full border border-white/10 object-cover shrink-0"
                    />
                    <p
                      className="text-sm font-medium text-white/80"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      {selected.submitted_by}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CalendarMinimalistic className="h-3 w-3 text-white/25" size={12} />
                    <span
                      className="text-[10px] text-white/30 font-medium"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      Submitted
                    </span>
                  </div>
                  <p
                    className="text-sm font-medium text-white/80"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {__format_date(selected.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AltArrowUp className="h-3 w-3 text-white/25" size={12} />
                    <span
                      className="text-[10px] text-white/30 font-medium"
                      style={{ letterSpacing: "-0.2px" }}
                    >
                      Votes
                    </span>
                  </div>
                  <p
                    className="text-sm font-medium text-white/80 tabular-nums"
                    style={{ letterSpacing: "-0.2px" }}
                  >
                    {votes[selected.id].count}
                  </p>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

