/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useManageContext } from '../context'
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Badge } from '@/components/ui/badge'
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from '@/lib/utils'
import {
  Activity, TrendingUp, BarChart2, CheckCircle2,
  XCircle, ExternalLink, Hash, Settings2,
  ShieldCheck, AlertTriangle, RefreshCw,
  MoreHorizontal
} from 'lucide-react'

// - TYPES - \\

interface guild_stats {
  total: number
  today: number
  this_week: number
  success_rate: number
  chart: { date: string; count: number }[]
}

interface bypass_log_row {
  id: number
  user_id: string
  user_tag: string
  avatar: string | null
  url: string
  result_url: string | null
  success: boolean
  created_at: string
}

interface guild_settings_state {
  bypass_channel: string | null
  bypass_enabled: boolean
  bypass_roles: string[]
}

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=64`

const __avatar_url = (user_id: string, avatar: string | null) =>
  avatar
    ? `https://cdn.discordapp.com/avatars/${user_id}/${avatar}.webp?size=32`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user_id) % 5}.png`

const __fmt_relative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const __truncate = (s: string, n = 40) => s.length > n ? `${s.slice(0, n)}…` : s

// - BAR CHART - \\

const chartConfig = {
  count: {
    label: "Bypassed Links",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig

function BypassBarChart({ data }: { data: { date: string; count: number }[] }) {
  const filled = React.useMemo(() => {
    const arr: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      arr.push({ date: key, count: data.find(r => r.date === key)?.count ?? 0 })
    }
    return arr
  }, [data])

  const total = React.useMemo(
    () => filled.reduce((acc, curr) => acc + curr.count, 0),
    [filled],
  )

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
      <CardHeader className="flex flex-col items-stretch border-b border-border/40 sm:flex-row sm:items-center sm:justify-between px-6 py-5">
        <div className="flex flex-col justify-center gap-1.5">
          <CardTitle className="text-lg">Activity Overview</CardTitle>
          <CardDescription className="text-sm">
            Total bypass requests processed over the last 14 days
          </CardDescription>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 pt-4 sm:pt-0 border-t border-border/40 sm:border-t-0 sm:border-l sm:border-border/40 sm:pl-8 mt-4 sm:mt-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Bypasses</span>
          <span className="text-3xl font-bold sm:text-4xl leading-none text-foreground">{total.toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-6 sm:px-6 sm:pt-8 sm:pb-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={filled}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="count"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// - STAT CARD - \\

const __stat_items = [
  { label: 'All Time', key: 'total' as const, icon: BarChart2 },
  { label: 'This Week', key: 'this_week' as const, icon: TrendingUp },
  { label: 'Today', key: 'today' as const, icon: Activity },
  { label: 'Success Rate', key: 'rate' as const, icon: CheckCircle2 },
] as const

// - PAGE - \\

export default function OverviewPage() {
  const router = useRouter()
  const { guild_id, guild } = useManageContext()

  const [stats, set_stats] = useState<guild_stats | null>(null)
  const [settings, set_settings] = useState<guild_settings_state | null>(null)
  const [recent, set_recent] = useState<bypass_log_row[]>([])
  const [refreshing, set_refreshing] = useState(false)
  const [loading, set_loading] = useState(true)

  const fetch_all = useCallback(async (silent = false) => {
    if (!silent) set_loading(true)
    else set_refreshing(true)
    try {
      const [stats_r, settings_r, logs_r] = await Promise.all([
        fetch(`/api/bot-dashboard/${guild_id}/stats`),
        fetch(`/api/bot-dashboard/${guild_id}/settings`),
        fetch(`/api/bot-dashboard/${guild_id}/logs?limit=5&offset=0`),
      ])

      if (stats_r.ok) {
        const d = await stats_r.json()
        set_stats(d)
      }
      if (settings_r.ok) {
        const d = await settings_r.json()
        set_settings({
          bypass_channel: d.settings?.bypass_channel ?? null,
          bypass_enabled: d.settings?.bypass_enabled !== 'false',
          bypass_roles: d.settings?.bypass_roles ?? [],
        })
      }
      if (logs_r.ok) {
        const d = await logs_r.json()
        set_recent(d.logs ?? [])
      }
    } catch {
      // - non-critical - \\
    } finally {
      set_loading(false)
      set_refreshing(false)
    }
  }, [guild_id])

  useEffect(() => { fetch_all() }, [fetch_all])

  const success_rate = stats
    ? stats.total > 0 ? `${Math.round((stats.success_rate ?? 0) * 100)}%` : 'N/A'
    : 'N/A'

  return (
    <div className="px-6 py-6 md:py-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto w-full space-y-6">

      {/* - PAGE HEADER - \\ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics and current status for <span className="font-medium text-foreground">{guild?.name ?? 'this server'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetch_all(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-50 h-10 px-4 border border-border/80 rounded-xl bg-card hover:bg-muted/50 hover:text-foreground shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* - STAT CARDS - \\ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {__stat_items.map((item) => {
          const value = item.key === 'rate'
            ? success_rate
            : (stats?.[item.key] ?? 0).toLocaleString()
          return (
            <Card key={item.label} className="bg-card rounded-2xl shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                <div className="p-2 bg-muted/40 rounded-lg border border-border/40">
                  <item.icon className="h-4 w-4 text-foreground/70" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 mt-1">
                <div className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-7 w-20 rounded-md" /> : value}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* - CHART - \\ */}
      {loading ? (
        <Card className="shadow-sm border-border/60 bg-card rounded-2xl">
          <CardContent className="h-[340px] flex items-center justify-center p-6">
            <Skeleton className="h-full w-full rounded-xl" />
          </CardContent>
        </Card>
      ) : (
        <BypassBarChart data={stats?.chart ?? []} />
      )}

      {/* - BOTTOM ROW - \\ */}
      <div className="space-y-6">

        {/* - RECENT ACTIVITY - \\ */}
        <Card className="shadow-sm rounded-2xl border-border/60 bg-card flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-5 border-b border-border/40 bg-muted/10 pb-5 mb-0">
            <div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-xs mt-1">Latest bypass attempts by members</CardDescription>
            </div>
            <button
              onClick={() => router.push(`/bypass/manage/${guild_id}/log`)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors bg-background border border-border/50 px-3 py-1.5 rounded-lg shadow-sm shrink-0"
            >
              View all <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent bg-muted/5">
                    <TableHead className="w-1/4 pl-6 h-11 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Member</TableHead>
                    <TableHead className="w-auto h-11 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">URL</TableHead>
                    <TableHead className="w-1/6 text-right h-11 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Time</TableHead>
                    <TableHead className="w-[100px] pr-6 text-right h-11 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-border/40 hover:bg-transparent">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-40 rounded-md" />
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="pr-6 text-right py-3.5">
                        <Skeleton className="h-5 w-5 rounded-full ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : recent.length === 0 ? (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={4} className="h-[200px] text-center text-sm text-muted-foreground">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map(log => (
                    <TableRow key={log.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={__avatar_url(log.user_id, log.avatar)}
                            alt={log.user_tag}
                            className="w-8 h-8 rounded-full ring-1 ring-border/50 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[160px] block">{log.user_tag}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">{log.user_id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-left w-full max-w-[150px] sm:max-w-[250px]">
                        <code className="font-mono text-[11px] px-2 py-1 bg-muted/40 rounded-md text-muted-foreground group-hover:bg-muted/60 transition-colors truncate block border border-border/40 hover:text-foreground" title={log.url}>
                          {__truncate(log.url)}
                        </code>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {__fmt_relative(log.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right py-3.5">
                        <div className="flex items-center justify-end">
                          {log.success
                            ? <Badge variant="outline" className="text-[10px] font-medium border-emerald-800/30 text-emerald-400 bg-emerald-500/10 gap-1 pl-1.5 pr-2 py-0 h-5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Success
                              </Badge>
                            : <Badge variant="outline" className="text-[10px] font-medium border-rose-800/30 text-rose-400 bg-rose-500/10 gap-1 pl-1.5 pr-2 py-0 h-5">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                Failed
                              </Badge>
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
