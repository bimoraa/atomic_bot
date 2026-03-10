/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useCallback }    from 'react'
import { useRouter }                            from 'next/navigation'
import { BypassFloatingDock }                   from '@/components/layout/bypass_floating_dock'
import { Card, CardContent, CardHeader, CardTitle,
         CardDescription, CardFooter }         from '@/components/ui/card'
import { Button }                               from '@/components/ui/button'
import { Skeleton }                             from '@/components/ui/skeleton'
import { Alert, AlertDescription }             from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Loader2, AlertCircle,
  Settings2, Search,
} from 'lucide-react'

// - TYPES - \\

interface discord_user {
  id       : string
  username : string
  avatar  ?: string
}

interface guild_item {
  id   : string
  name : string
  icon : string | null
}

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=256`

// - PAGE - \\

export default function BypassDashboardPage() {
  const router = useRouter()

  const [user, set_user]                 = useState<discord_user | null>(null)
  const [guilds, set_guilds]             = useState<guild_item[]>([])
  const [loading_auth, set_loading_auth] = useState(true)
  const [loading_guilds, set_loading_guilds] = useState(false)
  const [global_error, set_global_error] = useState<string | null>(null)
  const [guild_search, set_guild_search] = useState('')

  // - AUTH CHECK - \\
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/api/auth/discord?return_to=/bypass/dashboard')
          return
        }
        set_user(data.user)
        set_loading_auth(false)
        fetch_guilds()
      })
      .catch(() => router.push('/login'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // - FETCH USER GUILDS - \\
  const fetch_guilds = useCallback(async () => {
    set_loading_guilds(true)
    set_global_error(null)
    try {
      const r = await fetch('/api/bot-dashboard/guilds')
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/api/auth/discord?return_to=/bypass/dashboard')
          return
        }
        throw new Error((await r.json()).error)
      }
      const data = await r.json()
      set_guilds(data.guilds ?? [])
    } catch (err) {
      set_global_error((err as Error).message ?? 'Failed to fetch guilds')
    } finally {
      set_loading_guilds(false)
    }
  }, [router])

  // - LOADING SCREEN - \\
  if (loading_auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered_guilds = guild_search.trim()
    ? guilds.filter(g => g.name.toLowerCase().includes(guild_search.toLowerCase()))
    : guilds

  return (
    <div className="min-h-screen bg-background">

      {/* - TOP BAR - \\ */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/atomc.svg" alt="Atomic" className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground">Bypass Dashboard</span>
            <span className="text-xs text-muted-foreground">/ Servers</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                {user.avatar && (
                  <AvatarImage
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`}
                    alt={user.username}
                  />
                )}
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.username}</span>
            </div>
          )}
        </div>
      </header>

      {/* - MAIN CONTENT - \\ */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-28">

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Your Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a server to manage its bypass settings.
          </p>
        </div>

        {global_error && (
          <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{global_error}</AlertDescription>
          </Alert>
        )}

        {/* - SEARCH BAR - \\ */}
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search servers..."
            value={guild_search}
            onChange={e => set_guild_search(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* - GUILD CARDS - \\ */}
        {loading_guilds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden pt-0">
                <CardContent className="px-0">
                  <Skeleton className="aspect-video w-full rounded-none" />
                </CardContent>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-44 mt-1" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-9 w-20" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Settings2 className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No servers found with Manage Server permission.</p>
          </div>
        ) : filtered_guilds.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No servers match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered_guilds.map(guild => (
              <Card key={guild.id} className="overflow-hidden pt-0">
                <CardContent className="px-0">
                  {/* - BANNER AREA - \\ */}
                  <div className="aspect-video w-full relative overflow-hidden bg-muted/50">
                    {guild.icon ? (
                      <img
                        src={__guild_icon_url(guild.id, guild.icon)}
                        alt={guild.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-bold text-muted-foreground/30">
                          {guild.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardHeader>
                  <CardTitle className="text-base truncate">{guild.name}</CardTitle>
                  <CardDescription className="font-mono text-xs truncate">{guild.id}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button size="sm" onClick={() => router.push(`/bypass/manage/${guild.id}`)}>
                    Manage
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

      </main>

      <BypassFloatingDock />
    </div>
  )
}