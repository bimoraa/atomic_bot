/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams }                              from "next/navigation"
import { Input }                                       from "@/components/ui/input"
import { Textarea }                                    from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MainTopbar }                                  from "@/components/layout/main_topbar"
import { Loader2, CheckCircle2, Search, X }            from "lucide-react"
import { cn }                                          from "@/lib/utils"
import Image                                           from "next/image"

interface roblox_game {
  universe_id : number
  name        : string
  description : string
  image       : string | null
  playing     : number
  visits      : number
}

type suggest_type = "add_game_support" | "add_new_feature"

// - inner form content — needs Suspense because of useSearchParams - \\
function SuggestFeatureContent() {
  const search_params = useSearchParams()
  const token         = search_params.get("token")

  const [suggest_type, set_suggest_type]               = useState<suggest_type>("add_new_feature")
  const [game_search, set_game_search]                 = useState("")
  const [game_results, set_game_results]               = useState<roblox_game[]>([])
  const [selected_game, set_selected_game]             = useState<roblox_game | null>(null)
  const [feature_description, set_feature_description] = useState("")
  const [reason, set_reason]                           = useState("")
  const [loading, set_loading]                         = useState(false)
  const [searching, set_searching]                     = useState(false)
  const [submitted, set_submitted]                     = useState(false)
  const [error, set_error]                             = useState("")

  // - debounced roblox game search - \\
  const search_games = useCallback(async (query: string) => {
    if (query.length < 2) {
      set_game_results([])
      return
    }

    set_searching(true)
    try {
      const res  = await fetch(`/api/suggestions/roblox?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      set_game_results(data.games || [])
    } catch {
      set_game_results([])
    } finally {
      set_searching(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => search_games(game_search), 400)
    return () => clearTimeout(timeout)
  }, [game_search, search_games])

  const handle_submit = async () => {
    if (!token) {
      set_error("Invalid suggestion link. Please use /suggest-feature in Discord.")
      return
    }

    if (!feature_description.trim()) {
      set_error("Please describe the feature you want to suggest.")
      return
    }

    if (suggest_type === "add_game_support" && !selected_game) {
      set_error("Please search and select a game.")
      return
    }

    set_loading(true)
    set_error("")

    try {
      const res = await fetch("/api/suggestions/submit", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          token,
          suggest_type,
          game_name           : selected_game?.name || null,
          game_id             : selected_game?.universe_id?.toString() || null,
          game_image          : selected_game?.image || null,
          feature_description : feature_description.trim(),
          reason              : reason.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        set_error(data.error || "Failed to submit suggestion.")
        return
      }

      set_submitted(true)
    } catch {
      set_error("Network error. Please try again.")
    } finally {
      set_loading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <MainTopbar />
        <div className="max-w-md w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
          <p className="text-sm text-white/40">
            Invalid link. Use <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-white/60 font-normal">/suggest-feature</code> in Discord to get a valid form link.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <MainTopbar />
        <div className="max-w-md w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Suggestion Submitted</h2>
            <p className="text-sm text-white/40 mt-1">
              It will appear in the suggestion channel shortly. Others can vote on it in Discord and here.
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded-xl text-sm text-white/50 border border-white/[0.07] hover:text-white/80 hover:border-white/[0.12] transition-all duration-150"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <MainTopbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        {/* - page title - */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-white" style={{ letterSpacing: "-0.1px" }}>Suggest a Feature</h1>
          <p className="text-sm font-normal text-white/40 mt-1">
            Help us improve — describe what you want to see
          </p>
        </div>

        <div className="space-y-5">
          {/* - type selector - */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Suggestion Type</label>
            <Select
              value={suggest_type}
              onValueChange={(v) => {
                set_suggest_type(v as suggest_type)
                set_selected_game(null)
                set_game_results([])
                set_game_search("")
              }}
            >
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-11 focus:ring-0 focus:border-white/[0.14]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141416] border-white/[0.08] text-white/80">
                <SelectItem value="add_game_support">Add Game Support</SelectItem>
                <SelectItem value="add_new_feature">Add New Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* - game search - */}
          {suggest_type === "add_game_support" ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Game to Add <span className="text-red-400/70 normal-case tracking-normal font-normal">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 animate-spin" />
                )}
                <Input
                  placeholder="Search Roblox games..."
                  value={game_search}
                  onChange={(e) => set_game_search(e.target.value)}
                  className="pl-10 pr-10 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/25 rounded-xl h-11 focus-visible:ring-0 focus-visible:border-white/[0.16]"
                />
              </div>

              {game_results.length > 0 && !selected_game && (
                <div className="border border-white/[0.07] rounded-xl overflow-hidden bg-[#111113]">
                  {game_results.map((game, idx) => (
                    <button
                      key={game.universe_id}
                      onClick={() => { set_selected_game(game); set_game_results([]); set_game_search(game.name) }}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors",
                        idx !== game_results.length - 1 && "border-b border-white/[0.05]",
                      )}
                    >
                      {game.image && (
                        <Image src={game.image} alt={game.name} width={36} height={36} className="rounded-lg border border-white/[0.08] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{game.name}</p>
                        <p className="text-xs text-white/30">{game.playing?.toLocaleString()} playing</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selected_game && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  {selected_game.image && (
                    <Image src={selected_game.image} alt={selected_game.name} width={40} height={40} className="rounded-lg border border-white/[0.08] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{selected_game.name}</p>
                    <p className="text-xs text-white/30">ID: {selected_game.universe_id}</p>
                  </div>
                  <button
                    onClick={() => { set_selected_game(null); set_game_search("") }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Game to Update <span className="text-white/25 normal-case tracking-normal font-normal text-xs">(optional)</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 animate-spin" />
                )}
                <Input
                  placeholder="Search Roblox games..."
                  value={game_search}
                  onChange={(e) => set_game_search(e.target.value)}
                  className="pl-10 pr-10 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/25 rounded-xl h-11 focus-visible:ring-0 focus-visible:border-white/[0.16]"
                />
              </div>

              {game_results.length > 0 && !selected_game && (
                <div className="border border-white/[0.07] rounded-xl overflow-hidden bg-[#111113]">
                  {game_results.map((game, idx) => (
                    <button
                      key={game.universe_id}
                      onClick={() => { set_selected_game(game); set_game_results([]); set_game_search(game.name) }}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors",
                        idx !== game_results.length - 1 && "border-b border-white/[0.05]",
                      )}
                    >
                      {game.image && (
                        <Image src={game.image} alt={game.name} width={36} height={36} className="rounded-lg border border-white/[0.08] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{game.name}</p>
                        <p className="text-xs text-white/30">{game.playing?.toLocaleString()} playing</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selected_game && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  {selected_game.image && (
                    <Image src={selected_game.image} alt={selected_game.name} width={40} height={40} className="rounded-lg border border-white/[0.08] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{selected_game.name}</p>
                    <p className="text-xs text-white/30">ID: {selected_game.universe_id}</p>
                  </div>
                  <button
                    onClick={() => { set_selected_game(null); set_game_search("") }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* - feature description - */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                {suggest_type === "add_game_support" ? "Feature to Add" : "Feature Suggested"}
                {" "}<span className="text-red-400/70 normal-case tracking-normal font-normal">*</span>
              </label>
              <span className="text-xs text-white/20 tabular-nums">{feature_description.length}/4000</span>
            </div>
            <p className="text-[11px] text-white/25">Supports Markdown formatting</p>
            <Textarea
              placeholder="Describe the feature in detail..."
              value={feature_description}
              onChange={(e) => set_feature_description(e.target.value)}
              rows={6}
              maxLength={4000}
              className="bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/25 rounded-xl focus-visible:ring-0 focus-visible:border-white/[0.16] resize-none"
            />
          </div>

          {/* - reason - */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                {suggest_type === "add_game_support" ? "Why add this game?" : "Why add this feature?"}
              </label>
              <span className="text-xs text-white/20 tabular-nums">{reason.length}/2000</span>
            </div>
            <Textarea
              placeholder="Explain why this would benefit the community..."
              value={reason}
              onChange={(e) => set_reason(e.target.value)}
              rows={3}
              maxLength={2000}
              className="bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/25 rounded-xl focus-visible:ring-0 focus-visible:border-white/[0.16] resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handle_submit}
            disabled={loading || !feature_description.trim()}
            className={cn(
              "w-full h-11 rounded-xl text-sm font-medium transition-all duration-150",
              loading || !feature_description.trim()
                ? "bg-white/[0.04] border border-white/[0.06] text-white/25 cursor-not-allowed"
                : "bg-white/[0.09] border border-white/[0.11] text-white/90 hover:bg-white/[0.13] hover:border-white/[0.16]",
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Suggestion"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// - suspense wrapper — required so useSearchParams works correctly in next.js 15 - \\
export default function SuggestFeaturePage() {
  return (
    <Suspense>
      <SuggestFeatureContent />
    </Suspense>
  )
}
