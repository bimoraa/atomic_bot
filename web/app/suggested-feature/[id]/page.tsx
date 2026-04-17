/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useState } from "react"
import { useParams }            from "next/navigation"
import { Button }               from "@/components/ui/button"
import { Card, CardContent }    from "@/components/ui/card"
import { AtomicLogo }           from "@/components/icons/atomic_logo"
import { Loader2, ThumbsUp, ArrowLeft } from "lucide-react"
import Image                    from "next/image"
import Link                     from "next/link"

interface suggestion_detail {
  id                  : string
  user_id             : string
  suggest_type        : string
  game_name           : string | null
  game_id             : string | null
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

export default function SuggestionDetailPage() {
  const params = useParams()
  const id     = params.id as string

  const [suggestion, set_suggestion] = useState<suggestion_detail | null>(null)
  const [loading, set_loading]       = useState(true)
  const [user, set_user]             = useState<auth_user | null>(null)
  const [has_voted, set_has_voted]   = useState(false)
  const [voting, set_voting]         = useState(false)

  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) set_user(data.user)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    set_loading(true)
    fetch(`/api/suggestions`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.suggestions || []).find((s: suggestion_detail) => s.id === id)
        set_suggestion(found || null)
      })
      .catch(() => {})
      .finally(() => set_loading(false))
  }, [id])

  const handle_vote = async () => {
    if (!user) {
      const return_to = encodeURIComponent(window.location.pathname)
      window.location.href = `/api/auth/discord?return_to=${return_to}`
      return
    }

    set_voting(true)
    try {
      const res  = await fetch("/api/suggestions/vote", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ suggestion_id: id }),
      })
      const data = await res.json()

      if (data.success && suggestion) {
        set_suggestion({ ...suggestion, vote_count: data.vote_count })
        set_has_voted(data.voted)
      }
    } catch {
      // - silent - \\
    } finally {
      set_voting(false)
    }
  }

  const format_date = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year   : "numeric",
      month  : "long",
      day    : "numeric",
      hour   : "2-digit",
      minute : "2-digit",
    })
  }

  const type_label = (type: string) => {
    return type === "add_game_support" ? "Add Game Support" : "Add New Feature"
  }

  const status_color = (status: string) => {
    switch (status) {
      case "approved": return "text-green-400"
      case "rejected": return "text-red-400"
      default:         return "text-yellow-400"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!suggestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AtomicLogo className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Suggestion not found.</p>
            <Link href="/suggested-feature">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Suggestions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* - back link - */}
        <Link href="/suggested-feature" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Suggestions
        </Link>

        {/* - main card - */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* - header - */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {type_label(suggestion.suggest_type)}
                  </span>
                  <span className={`text-xs capitalize font-medium ${status_color(suggestion.status)}`}>
                    {suggestion.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted on {format_date(suggestion.created_at)}
                </p>
              </div>

              <Button
                onClick={handle_vote}
                disabled={voting}
                variant={has_voted ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                {voting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsUp className={`h-4 w-4 ${has_voted ? "fill-current" : ""}`} />
                )}
                {suggestion.vote_count} Upvote{suggestion.vote_count !== 1 ? "s" : ""}
              </Button>
            </div>

            {/* - game info - */}
            {suggestion.game_name && (
              <div className="flex items-center gap-3 p-3 border rounded-md bg-accent/30">
                {suggestion.game_image && (
                  <Image
                    src={suggestion.game_image}
                    alt={suggestion.game_name}
                    width={48}
                    height={48}
                    className="rounded-md"
                  />
                )}
                <div>
                  <p className="font-medium text-sm">{suggestion.game_name}</p>
                  {suggestion.game_id && (
                    <p className="text-xs text-muted-foreground">Game ID: {suggestion.game_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* - feature description - */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Feature Description</h3>
              <div className="text-sm whitespace-pre-wrap bg-accent/20 rounded-md p-4">
                {suggestion.feature_description}
              </div>
            </div>

            {/* - reason - */}
            {suggestion.reason && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Reason</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {suggestion.reason}
                </p>
              </div>
            )}

            {/* - submitter - */}
            <div className="pt-4 border-t text-xs text-muted-foreground">
              Suggested by user ID: {suggestion.user_id}
            </div>

            {/* - login prompt - */}
            {!user && (
              <div className="text-center p-4 border rounded-md bg-accent/10">
                <p className="text-sm text-muted-foreground mb-2">
                  Login with Discord to vote on this suggestion
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const return_to = encodeURIComponent(window.location.pathname)
                    window.location.href = `/api/auth/discord?return_to=${return_to}`
                  }}
                >
                  Login with Discord
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
