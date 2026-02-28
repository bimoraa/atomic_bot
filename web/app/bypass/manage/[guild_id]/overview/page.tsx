'use client'

import { useEffect, useState, useCallback }  from 'react'
import { useManageContext }                   from '../context'
import { Card, CardContent, CardHeader,
         CardTitle, CardDescription }        from '@/components/ui/card'
import { Skeleton }                          from '@/components/ui/skeleton'
import { Badge }                             from '@/components/ui/badge'
import { Activity, TrendingUp, BarChart2,
         ExternalLink }                      from 'lucide-react'

// - TYPES - \\

interface guild_stats {
  total     : number
  today     : number
  this_week : number
  chart     : { date: string; count: number }[]
}

// - BAR CHART - \\

function BypassBarChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">No data yet</p>
    </div>
  )

  const filled: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 86400_000)
    const key = d.toISOString().slice(0, 10)
    const row = data.find(r => r.date === key)
    filled.push({ date: key, count: row?.count ?? 0 })
  }

  const max     = Math.max(...filled.map(r => r.count), 1)
  const fmt_day = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-28">
        {filled.map(r => {
          const pct      = (r.count / max) * 100
          const is_today = r.date === new Date().toISOString().slice(0, 10)
          return (
            <div key={r.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className={`w-full rounded-t transition-all ${is_today ? 'bg-primary/80' : 'bg-muted-foreground/25 group-hover:bg-muted-foreground/40'}`}
                style={{ height: `${Math.max(pct, pct > 0 ? 4 : 0)}%`, minHeight: r.count > 0 ? '4px' : '2px' }}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                <div className="bg-popover border border-border text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
                  <span className="text-muted-foreground">{fmt_day(r.date)}: </span>
                  <span className="font-semibold text-foreground">{r.count}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {filled.map((r, i) => (
          <div key={r.date} className="flex-1 text-center">
            {i % 3 === 0 && (
              <span className="text-[9px] text-muted-foreground">
                {fmt_day(r.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=64`

const __invite_url =
  'https://discord.com/oauth2/authorize?client_id=1476977037070696612&permissions=0&scope=bot+applications.commands'

// - PAGE - \\

export default function OverviewPage() {
  const { guild_id, guild } = useManageContext()

  const [stats, set_stats]                     = useState<guild_stats | null>(null)
  const [loading_stats, set_loading_stats]     = useState(true)
  const [loading_settings, set_loading_settings] = useState(true)
  const [is_configured, set_is_configured]     = useState(false)

  const fetch_stats = useCallback(async () => {
    set_loading_stats(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/stats`)
      if (r.ok) set_stats(await r.json())
    } catch {
      // - non-critical - \\
    } finally {
      set_loading_stats(false)
    }
  }, [guild_id])

  const check_configured = useCallback(async () => {
    set_loading_settings(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/settings`)
      if (r.ok) {
        const data = await r.json()
        set_is_configured(Boolean(data.settings?.bypass_channel))
      }
    } catch {
      // - non-critical - \\
    } finally {
      set_loading_settings(false)
    }
  }, [guild_id])

  useEffect(() => {
    fetch_stats()
    check_configured()
  }, [fetch_stats, check_configured])

  return (
    <div className="space-y-6">

      {/* - PAGE TITLE - \\ */}
      <div className="flex items-center gap-3">
        {guild?.icon ? (
          <img src={__guild_icon_url(guild.id, guild.icon)} alt={guild.name} className="w-9 h-9 rounded-full" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">
              {guild?.name.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{guild?.name ?? guild_id}</h1>
          <p className="text-xs text-muted-foreground font-mono">{guild_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!loading_settings && (
            is_configured
              ? <Badge variant="outline" className="text-xs border-green-800 text-green-400 bg-green-900/20">Configured</Badge>
              : <Badge variant="outline" className="text-xs border-yellow-800 text-yellow-400 bg-yellow-900/20">Not Configured</Badge>
          )}
          <a
            href={__invite_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Invite
          </a>
        </div>
      </div>

      {/* - STATS CARD - \\ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            Overview
          </CardTitle>
          <CardDescription className="text-xs">
            Bypass activity for {guild?.name ?? guild_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading_stats ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  All Time
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {(stats?.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  This Week
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {(stats?.this_week ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart2 className="w-3 h-3" />
                  Today
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {(stats?.today ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Last 14 days</p>
            {loading_stats
              ? <Skeleton className="h-32 w-full rounded-lg" />
              : <BypassBarChart data={stats?.chart ?? []} />
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
