/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
}                                      from 'recharts'
import { Card, CardContent,
         CardHeader, CardTitle,
         CardDescription }             from '@/components/ui/card'
import { Badge }                       from '@/components/ui/badge'
import { Separator }                   from '@/components/ui/separator'
import { Skeleton }                    from '@/components/ui/skeleton'
import {
  Activity,
  Database,
  Wifi,
  Cpu,
  Clock,
  Zap,
  Radio,
  HardDrive,
}                                      from 'lucide-react'

// - TYPES - \\

interface bot_stats {
  status          : 'alive' | 'starting' | 'offline'
  bot_ready       : boolean
  ws_ping         : number
  api_latency     : number
  db_latency      : number
  memory          : {
    rss_mb        : number
    heap_used_mb  : number
    heap_total_mb : number
    external_mb   : number
  }
  uptime          : number
  uptime_formatted: string
  timestamp       : number
  sampled_at      : number
}

interface history_point {
  time       : string
  ws_ping    : number
  api_latency: number
  db_latency : number
  heap_mb    : number
  rss_mb     : number
}

// - CONSTANTS - \\

const __max_history   = 60    // - 60 samples = ~3 minutes at 3s interval - \\
const __ping_warn_ms  = 100
const __ping_crit_ms  = 300

// - HELPERS - \\

/**
 * @description returns a tailwind text-color class based on ping value
 * @param {number} ms - latency in milliseconds
 * @returns {string} tailwind class
 */
function ping_color(ms: number): string {
  if (ms < 0)              return 'text-muted-foreground'
  if (ms < __ping_warn_ms) return 'text-emerald-400'
  if (ms < __ping_crit_ms) return 'text-amber-400'
  return 'text-red-400'
}

/**
 * @description formats a latency value for display
 * @param {number} ms - latency in milliseconds
 * @returns {string} formatted string
 */
function fmt_ms(ms: number): string {
  if (ms < 0) return '—'
  return `${ms}ms`
}

/**
 * @description formats a timestamp as HH:MM:SS
 * @param {number} ts - unix timestamp ms
 * @returns {string} formatted time string
 */
function fmt_time(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false })
}

/**
 * @description returns the status badge variant colors
 * @param {'alive' | 'starting' | 'offline'} status
 * @returns {string} tailwind classes
 */
function status_badge_class(status: string): string {
  if (status === 'alive')    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (status === 'starting') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

// - CUSTOM TOOLTIP FOR CHARTS - \\

function chart_tooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="text-foreground font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// - STAT CARD - \\

interface stat_card_props {
  icon     : React.ReactNode
  label    : string
  value    : string
  sub     ?: string
  color   ?: string
  loading ?: boolean
}

function StatCard({ icon, label, value, sub, color = 'text-foreground', loading = false }: stat_card_props) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              {icon}
              <span>{label}</span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
            )}
            {sub && !loading && (
              <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// - PAGE - \\

export default function BotStatsPage() {
  const [stats, set_stats]         = useState<bot_stats | null>(null)
  const [history, set_history]     = useState<history_point[]>([])
  const [connected, set_connected] = useState(false)
  const [loading, set_loading]     = useState(true)
  const event_source_ref           = useRef<EventSource | null>(null)

  // - 将新的快照追加到滚动历史窗口 - \\
  // - append new snapshot to the rolling history window - \\
  const push_to_history = useCallback((s: bot_stats) => {
    const point: history_point = {
      time       : fmt_time(s.sampled_at),
      ws_ping    : s.ws_ping >= 0    ? s.ws_ping    : 0,
      api_latency: s.api_latency >= 0 ? s.api_latency : 0,
      db_latency : s.db_latency >= 0  ? s.db_latency  : 0,
      heap_mb    : s.memory.heap_used_mb,
      rss_mb     : s.memory.rss_mb,
    }
    set_history(prev => {
      const next = [...prev, point]
      return next.length > __max_history ? next.slice(next.length - __max_history) : next
    })
  }, [])

  // - 拉取初始快照 - \\
  // - load initial snapshot - \\
  useEffect(() => {
    fetch('/api/bot-stats')
      .then(r => r.json())
      .then((data: bot_stats) => {
        set_stats(data)
        push_to_history(data)
        set_loading(false)
      })
      .catch(() => set_loading(false))
  }, [push_to_history])

  // - 建立 SSE 连接以实现实时更新 - \\
  // - connect SSE for realtime updates - \\
  useEffect(() => {
    const es = new EventSource('/api/bot-stats/stream')
    event_source_ref.current = es

    es.onopen = () => set_connected(true)

    es.onmessage = (e) => {
      try {
        const data: bot_stats = JSON.parse(e.data)
        set_stats(data)
        push_to_history(data)
        set_loading(false)
      } catch {}
    }

    es.onerror = () => {
      set_connected(false)
    }

    return () => {
      es.close()
      event_source_ref.current = null
    }
  }, [push_to_history])

  // - DERIVED - \\
  const is_offline = !stats || stats.status === 'offline'
  const mem_pct    = stats
    ? Math.round((stats.memory.heap_used_mb / Math.max(stats.memory.heap_total_mb, 1)) * 100)
    : 0

  // - TICK FORMATTER FOR CHART X AXIS - \\
  const tick_formatter = (v: string, i: number) => {
    if (history.length <= 10) return v
    return i % Math.ceil(history.length / 6) === 0 ? v : ''
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* - HEADER - \\ */}
      <div className="border-b border-border sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/atomc.svg" alt="Atomic" className="w-6 h-6" />
            <span className="font-semibold text-sm">Atomic Bot</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground text-sm">Status</span>
          </div>
          <div className="flex items-center gap-2">
            {/* - LIVE INDICATOR - \\ */}
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}>
              <Radio className="w-3 h-3" />
              <span>{connected ? 'Live' : 'Connecting...'}</span>
            </div>
            {stats && (
              <div className={`text-xs px-2 py-1 rounded-full border ${status_badge_class(stats.status)}`}>
                {stats.status === 'alive' ? 'Online' : stats.status === 'starting' ? 'Starting' : 'Offline'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* - STAT CARDS - \\ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon    = {<Wifi className="w-3 h-3" />}
            label   = "WS Ping"
            value   = {stats ? fmt_ms(stats.ws_ping) : '—'}
            sub     = "WebSocket latency"
            color   = {stats ? ping_color(stats.ws_ping) : 'text-muted-foreground'}
            loading = {loading}
          />
          <StatCard
            icon    = {<Zap className="w-3 h-3" />}
            label   = "API Latency"
            value   = {stats ? fmt_ms(stats.api_latency) : '—'}
            sub     = "REST round-trip"
            color   = {stats ? ping_color(stats.api_latency) : 'text-muted-foreground'}
            loading = {loading}
          />
          <StatCard
            icon    = {<Database className="w-3 h-3" />}
            label   = "DB Latency"
            value   = {stats ? fmt_ms(stats.db_latency) : '—'}
            sub     = "PostgreSQL ping"
            color   = {stats ? ping_color(stats.db_latency) : 'text-muted-foreground'}
            loading = {loading}
          />
          <StatCard
            icon    = {<Cpu className="w-3 h-3" />}
            label   = "Heap Used"
            value   = {stats ? `${stats.memory.heap_used_mb} MB` : '—'}
            sub     = {stats ? `${mem_pct}% of ${stats.memory.heap_total_mb} MB` : undefined}
            loading = {loading}
          />
          <StatCard
            icon    = {<HardDrive className="w-3 h-3" />}
            label   = "RSS"
            value   = {stats ? `${stats.memory.rss_mb} MB` : '—'}
            sub     = "Resident set size"
            loading = {loading}
          />
          <StatCard
            icon    = {<Clock className="w-3 h-3" />}
            label   = "Uptime"
            value   = {stats ? stats.uptime_formatted : '—'}
            sub     = {stats ? new Date(stats.sampled_at).toLocaleString() : undefined}
            loading = {loading}
          />
        </div>

        {/* - RESPONSE TIME CHART - \\ */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Response Time
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  WS ping, API latency &amp; DB latency — last {__max_history} samples (3s interval)
                </CardDescription>
              </div>
              {/* - LEGEND - \\ */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />WS Ping</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400 inline-block rounded" />API</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />DB</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey     = "time"
                    tick        = {{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine    = {false}
                    axisLine    = {false}
                    tickFormatter = {tick_formatter}
                  />
                  <YAxis
                    tick      = {{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine  = {false}
                    axisLine  = {false}
                    unit      = "ms"
                  />
                  <Tooltip content={chart_tooltip} />
                  <Line
                    type        = "monotone"
                    dataKey     = "ws_ping"
                    name        = "WS Ping"
                    stroke      = "#60a5fa"
                    strokeWidth = {2}
                    dot         = {false}
                    activeDot   = {{ r: 3, fill: '#60a5fa' }}
                  />
                  <Line
                    type        = "monotone"
                    dataKey     = "api_latency"
                    name        = "API"
                    stroke      = "#a78bfa"
                    strokeWidth = {2}
                    dot         = {false}
                    activeDot   = {{ r: 3, fill: '#a78bfa' }}
                  />
                  <Line
                    type        = "monotone"
                    dataKey     = "db_latency"
                    name        = "DB"
                    stroke      = "#34d399"
                    strokeWidth = {2}
                    dot         = {false}
                    activeDot   = {{ r: 3, fill: '#34d399' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* - MEMORY CHART - \\ */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  Memory Usage
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Heap used &amp; RSS over time
                </CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />Heap</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" />RSS</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad_heap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%"  stopColor="#fbbf24" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="grad_rss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor="#fb923c" stopOpacity={0.25} />
                      <stop offset="95%"  stopColor="#fb923c" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey       = "time"
                    tick          = {{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine      = {false}
                    axisLine      = {false}
                    tickFormatter = {tick_formatter}
                  />
                  <YAxis
                    tick     = {{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine = {false}
                    axisLine = {false}
                    unit     = " MB"
                  />
                  <Tooltip content={chart_tooltip} />
                  <Area
                    type        = "monotone"
                    dataKey     = "heap_mb"
                    name        = "Heap MB"
                    stroke      = "#fbbf24"
                    strokeWidth = {2}
                    fill        = "url(#grad_heap)"
                  />
                  <Area
                    type        = "monotone"
                    dataKey     = "rss_mb"
                    name        = "RSS MB"
                    stroke      = "#fb923c"
                    strokeWidth = {2}
                    fill        = "url(#grad_rss)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* - LIVE PING BREAKDOWN TABLE - \\ */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              Current Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[
                  { label: 'Bot Status',    value: stats?.status === 'alive' ? 'Online' : stats?.status === 'starting' ? 'Starting…' : 'Offline', color: status_badge_class(stats?.status ?? 'offline'), is_badge: true },
                  { label: 'WebSocket Ping',value: fmt_ms(stats?.ws_ping ?? -1),         color: ping_color(stats?.ws_ping ?? -1) },
                  { label: 'API Latency',   value: fmt_ms(stats?.api_latency ?? -1),      color: ping_color(stats?.api_latency ?? -1) },
                  { label: 'DB Latency',    value: fmt_ms(stats?.db_latency ?? -1),        color: ping_color(stats?.db_latency ?? -1) },
                  { label: 'Heap Used',     value: stats ? `${stats.memory.heap_used_mb} MB / ${stats.memory.heap_total_mb} MB (${mem_pct}%)` : '—' },
                  { label: 'RSS',           value: stats ? `${stats.memory.rss_mb} MB` : '—' },
                  { label: 'Uptime',        value: stats?.uptime_formatted ?? '—' },
                  { label: 'Last sampled',  value: stats ? fmt_time(stats.sampled_at) : '—', color: 'text-muted-foreground' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 px-1">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    {row.is_badge ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${row.color || ''}`}>
                        {row.value}
                      </span>
                    ) : (
                      <span className={`text-sm font-medium tabular-nums ${row.color || 'text-foreground'}`}>
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* - OFFLINE NOTICE - \\ */}
        {!loading && is_offline && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400 flex items-center gap-3">
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span>Bot is currently offline or unreachable. Stats will update automatically when it comes back online.</span>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pb-4">
          Updates every 3 seconds via Server-Sent Events
        </div>
      </div>
    </div>
  )
}
