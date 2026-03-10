/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter }                         from 'next/navigation'
import { DashboardSidebar }                  from '@/components/layout/dashboard_sidebar'
import { Card, CardContent, CardHeader,
         CardTitle, CardDescription }        from '@/components/ui/card'
import { Button }                            from '@/components/ui/button'
import { Input }                             from '@/components/ui/input'
import { Label }                             from '@/components/ui/label'
import { Textarea }                          from '@/components/ui/textarea'
import { Badge }                             from '@/components/ui/badge'
import { Separator }                         from '@/components/ui/separator'
import { Skeleton }                          from '@/components/ui/skeleton'
import { Alert, AlertDescription }           from '@/components/ui/alert'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Loader2, AlertCircle, CheckCircle2,
         Hash, ShieldCheck, ShieldOff,
         Settings2, Server, ExternalLink }   from 'lucide-react'

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

interface bypass_settings {
  bypass_channel         ?: string
  bypass_enabled         ?: string
  bypass_disabled_reason ?: string
}

type save_state = 'idle' | 'saving' | 'ok' | 'error'

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=64`

const __invite_url =
    `https://discord.com/oauth2/authorize?client_id=1476977037070696612&permissions=4503599694556160&integration_type=0&scope=bot`
// - PAGE - \\

export default function BotDashboardPage() {
  const router = useRouter()

  const [user, set_user]                   = useState<discord_user | null>(null)
  const [guilds, set_guilds]               = useState<guild_item[]>([])
  const [selected, set_selected]           = useState<guild_item | null>(null)
  const [settings, set_settings]           = useState<bypass_settings | null>(null)
  const [loading_auth, set_loading_auth]   = useState(true)
  const [loading_guilds, set_loading_guilds] = useState(false)
  const [loading_settings, set_loading_settings] = useState(false)

  // - FORM FIELDS - \\
  const [channel_input, set_channel_input]     = useState('')
  const [disabled_reason, set_disabled_reason] = useState('')
  const [channel_save, set_channel_save]       = useState<save_state>('idle')
  const [enable_save, set_enable_save]         = useState<save_state>('idle')

  const [global_error, set_global_error] = useState<string | null>(null)

  // - AUTH CHECK - \\
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/api/auth/discord?return_to=/dashboard/bot')
          return
        }
        set_user(data.user)
        set_loading_auth(false)
        fetch_guilds()
      })
      .catch(() => {
        router.push('/login')
      })
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
          router.push('/api/auth/discord?return_to=/dashboard/bot')
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

  // - FETCH GUILD SETTINGS - \\
  const fetch_settings = useCallback(async (guild_id: string) => {
    set_loading_settings(true)
    set_settings(null)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/settings`)
      if (!r.ok) {
        const body = await r.json()
        throw new Error(body.error)
      }
      const data = await r.json()
      const s: bypass_settings = data.settings ?? {}
      set_settings(s)
      set_channel_input(s.bypass_channel ?? '')
      set_disabled_reason(s.bypass_disabled_reason ?? '')
    } catch (err) {
      set_global_error((err as Error).message ?? 'Failed to fetch settings')
    } finally {
      set_loading_settings(false)
    }
  }, [])

  const select_guild = useCallback((guild: guild_item) => {
    set_selected(guild)
    set_channel_save('idle')
    set_enable_save('idle')
    set_global_error(null)
    fetch_settings(guild.id)
  }, [fetch_settings])

  // - SAVE CHANNEL - \\
  const save_channel = async () => {
    if (!selected) return
    set_channel_save('saving')
    try {
      const r = await fetch(`/api/bot-dashboard/${selected.id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ bypass_channel: channel_input }),
      })
      set_channel_save(r.ok ? 'ok' : 'error')
      if (r.ok) {
        set_settings(prev => ({ ...prev, bypass_channel: channel_input }))
        setTimeout(() => set_channel_save('idle'), 2000)
      }
    } catch {
      set_channel_save('error')
    }
  }

  // - CLEAR CHANNEL - \\
  const clear_channel = async () => {
    if (!selected) return
    set_channel_save('saving')
    try {
      const r = await fetch(`/api/bot-dashboard/${selected.id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ clear_channel: true }),
      })
      if (r.ok) {
        set_settings(prev => ({ ...prev, bypass_channel: undefined }))
        set_channel_input('')
      }
      set_channel_save(r.ok ? 'ok' : 'error')
      setTimeout(() => set_channel_save('idle'), 2000)
    } catch {
      set_channel_save('error')
    }
  }

  // - TOGGLE BYPASS ENABLED - \\
  const set_enabled = async (enabled: boolean) => {
    if (!selected) return
    if (!enabled && !disabled_reason.trim()) {
      set_global_error('Reason is required when disabling bypass.')
      return
    }
    set_enable_save('saving')
    set_global_error(null)
    try {
      const body: Record<string, string> = { bypass_enabled: enabled ? 'true' : 'false' }
      if (!enabled) body.bypass_disabled_reason = disabled_reason.trim()
      const r = await fetch(`/api/bot-dashboard/${selected.id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(body),
      })
      if (r.ok) {
        set_settings(prev => ({
          ...prev,
          bypass_enabled         : enabled ? 'true' : 'false',
          bypass_disabled_reason : enabled ? undefined : disabled_reason.trim(),
        }))
        set_enable_save('ok')
        setTimeout(() => set_enable_save('idle'), 2000)
      } else {
        set_enable_save('error')
      }
    } catch {
      set_enable_save('error')
    }
  }

  // - RENDER LOADING - \\
  if (loading_auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="flex flex-col space-y-4 w-full max-w-4xl">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const is_enabled      = settings?.bypass_enabled !== 'false'
  const has_channel     = Boolean(settings?.bypass_channel)
  const is_configured   = has_channel

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar user={user ?? undefined} active_page="bot" />

      {/* - MAIN CONTENT - \\ */}
      <main className="flex-1 overflow-auto lg:pl-72 p-6 lg:p-8 pt-16 lg:pt-8">

        {/* - BREADCRUMB - \\ */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Bot Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Bot Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bypass settings for your servers.
          </p>
        </div>

        {global_error && (
          <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{global_error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* - GUILD LIST - \\ */}
          <Card className="lg:col-span-1 bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                Your Servers
              </CardTitle>
              <CardDescription className="text-xs">
                Servers where you have Manage Server permission
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading_guilds ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : guilds.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No servers found with Manage Server permission.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {guilds.map(guild => (
                    <li key={guild.id}>
                      <button
                        onClick={() => select_guild(guild)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors ${selected?.id === guild.id ? 'bg-accent' : ''}`}
                      >
                        {guild.icon ? (
                          <img
                            src={__guild_icon_url(guild.id, guild.icon)}
                            alt={guild.name}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {guild.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{guild.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* - SETTINGS PANEL - \\ */}
          <div className="lg:col-span-2 space-y-6">
            {!selected ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <Settings2 className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Select a server to manage its settings.</p>
                </CardContent>
              </Card>
            ) : loading_settings ? (
              <Card className="bg-card border-border">
                <CardContent className="py-10 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* - SERVER HEADER - \\ */}
                <Card className="bg-card border-border">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {selected.icon ? (
                        <img
                          src={__guild_icon_url(selected.id, selected.icon)}
                          alt={selected.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {selected.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{selected.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {is_configured
                        ? <Badge variant="outline" className="text-xs border-green-800 text-green-400 bg-green-900/20">Configured</Badge>
                        : <Badge variant="outline" className="text-xs border-yellow-800 text-yellow-400 bg-yellow-900/20">Not Configured</Badge>
                      }
                      <a
                        href={__invite_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Invite Bot
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* - BYPASS CHANNEL - \\ */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Bypass Channel
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Channel ID where <code className="text-xs bg-muted px-1 rounded">/bypass</code> command is allowed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings?.bypass_channel && (
                      <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-3 py-2">
                        Current: <span className="text-foreground">{settings.bypass_channel}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Channel ID (e.g. 1234567890123456789)"
                        value={channel_input}
                        onChange={e => set_channel_input(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={save_channel}
                        disabled={channel_save === 'saving' || !channel_input.trim()}
                        size="sm"
                        className="flex-shrink-0"
                      >
                        {channel_save === 'saving' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                        {channel_save === 'ok'     && <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" />}
                        Set
                      </Button>
                    </div>
                    {settings?.bypass_channel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs px-2"
                        onClick={clear_channel}
                        disabled={channel_save === 'saving'}
                      >
                        Clear channel
                      </Button>
                    )}
                    {channel_save === 'error' && (
                      <p className="text-xs text-destructive">Failed to save. Try again.</p>
                    )}
                  </CardContent>
                </Card>

                {/* - BYPASS STATUS - \\ */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {is_enabled
                        ? <ShieldCheck className="w-4 h-4 text-green-500" />
                        : <ShieldOff className="w-4 h-4 text-destructive" />
                      }
                      Bypass Status
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enable or disable the bypass feature for this server.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={is_enabled
                          ? 'border-green-800 text-green-400 bg-green-900/20'
                          : 'border-red-800 text-red-400 bg-red-900/20'
                        }
                      >
                        {is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {settings?.bypass_disabled_reason && !is_enabled && (
                        <span className="text-xs text-muted-foreground">
                          Reason: {settings.bypass_disabled_reason}
                        </span>
                      )}
                    </div>

                    <Separator />

                    {!is_enabled && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason (required to disable)</Label>
                        <Textarea
                          placeholder="Reason for disabling bypass..."
                          value={disabled_reason}
                          onChange={e => set_disabled_reason(e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    )}

                    {is_enabled && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Disable reason (required)</Label>
                        <Textarea
                          placeholder="Reason for disabling bypass..."
                          value={disabled_reason}
                          onChange={e => set_disabled_reason(e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={is_enabled ? 'outline' : 'default'}
                        className={!is_enabled ? 'bg-green-800/60 hover:bg-green-800 border-green-700 text-green-200' : ''}
                        disabled={enable_save === 'saving' || !is_enabled}
                        onClick={() => set_enabled(true)}
                      >
                        {enable_save === 'saving' && is_enabled === false
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : <ShieldCheck className="w-3 h-3 mr-1" />
                        }
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant={!is_enabled ? 'outline' : 'destructive'}
                        disabled={enable_save === 'saving' || !is_enabled}
                        onClick={() => set_enabled(false)}
                      >
                        {enable_save === 'saving' && is_enabled
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : <ShieldOff className="w-3 h-3 mr-1" />
                        }
                        Disable
                      </Button>
                      {enable_save === 'ok' && (
                        <span className="self-center text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Saved
                        </span>
                      )}
                      {enable_save === 'error' && (
                        <span className="self-center text-xs text-destructive">Failed to save.</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
