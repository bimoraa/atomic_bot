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
}                                from 'recharts'
import { Card, CardContent,
         CardHeader, CardTitle,
         CardDescription }       from '@/components/ui/card'
import { Badge }                 from '@/components/ui/badge'
import { Separator }             from '@/components/ui/separator'
import { Skeleton }              from '@/components/ui/skeleton'
import { cn }                    from '@/lib/utils'
import { Icon }                  from '@iconify/react'
import Link                      from 'next/link'
import { AtomicLogo }            from '@/components/icons/atomic_logo'

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

type service_status = 'operational' | 'degraded' | 'incident' | 'unknown'

// - CONSTANTS - \\

const __max_history  = 120
const __ping_warn_ms = 100
const __ping_crit_ms = 300
const __bar_count    = 50

// - HELPERS - \\

/**
 * @description formats uptime seconds into a human-readable string
 * @param {number} seconds - uptime in seconds
 * @returns {string} formatted uptime string
 */
function format_uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * @description derives a service_status from a latency value
 * @param {number} ms - latency in ms, -1 if unavailable
 * @returns {service_status}
 */
function ms_to_status(ms: number): service_status {
  if (ms < 0)              return 'incident'
  if (ms < __ping_warn_ms) return 'operational'
  if (ms < __ping_crit_ms) return 'degraded'
  return 'incident'
}

/**
 * @description formats a latency value for display
 * @param {number} ms - latency in milliseconds
 * @returns {string} formatted string
 */
function fmt_ms(ms: number): string {
  if (ms < 0) return '\u2014'
  return `${ms}ms`
}

/**
 * @description formats a unix timestamp as HH:MM:SS
 * @param {number} ts - unix timestamp in ms
 * @returns {string} formatted time
 */
function fmt_time(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false })
}

/**
 * @description returns themed tailwind classes for a service_status
 * @param {service_status} s
 * @returns {{ pill: string; icon_bg: string; bar: string; dot: string; text: string }}
 */
function status_theme(s: service_status): {
  pill   : string
  icon_bg: string
  bar    : string
  dot    : string
  text   : string
} {
  switch (s) {
    case 'operational': return {
      pill   : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon_bg: 'bg-emerald-500',
      bar    : 'bg-emerald-500',
      dot    : 'bg-emerald-400',
      text   : 'text-emerald-400',
    }
    case 'degraded': return {
      pill   : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon_bg: 'bg-amber-500',
      bar    : 'bg-amber-400',
      dot    : 'bg-amber-400',
      text   : 'text-amber-400',
    }
    case 'incident': return {
      pill   : 'bg-red-500/15 text-red-400 border-red-500/30',
      icon_bg: 'bg-red-500',
      bar    : 'bg-red-500',
      dot    : 'bg-red-400',
      text   : 'text-red-400',
    }
    default: return {
      pill   : 'bg-muted/50 text-muted-foreground border-border',
      icon_bg: 'bg-muted',
      bar    : 'bg-muted',
      dot    : 'bg-muted-foreground',
      text   : 'text-muted-foreground',
    }
  }
}

/**
 * @description returns the display label for a service status
 * @param {service_status} s
 * @returns {string}
 */
function status_label(s: service_status): string {
  switch (s) {
    case 'operational': return 'Operational'
    case 'degraded'   : return 'Degraded'
    case 'incident'   : return 'Incident'
    default           : return 'Unknown'
  }
}

/**
 * @description pads a bar array to __bar_count filling left side with 'operational'
 * @param {service_status[]} bars - existing bars
 * @returns {service_status[]}
 */
function pad_bars(bars: service_status[]): service_status[] {
  const needed = Math.max(0, __bar_count - bars.length)
  const fill   = Array<service_status>(needed).fill('operational')
  return [...fill, ...bars]
}

// - STATUS ICON - \\

/**
 * @description renders a colored circular status icon
 * @param {{ status: service_status; size?: string }} props
 * @returns {JSX.Element}
 */
function StatusIcon({ status, size = 'w-5 h-5' }: { status: service_status; size?: string }) {
  const theme      = status_theme(status)
  const icon_name  = status === 'operational' ? 'solar:check-circle-bold-duotone'
                   : status === 'degraded'    ? 'solar:danger-triangle-bold-duotone'
                   :                            'solar:expressionless-square-bold'
  return (
    <Icon icon={icon_name} className={`${size} ${theme.text} flex-shrink-0`} />
  )
}

// - CUSTOM CHART TOOLTIP - \\

function chart_tooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground mb-1.5 font-medium">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto text-foreground font-semibold tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// - SERVICE CARD - \\

interface service_card_props {
  icon_name    : string
  name         : string
  value        : string
  detail       : string
  status       : service_status
  bars         : service_status[]
  border_bottom?: boolean
  loading      ?: boolean
}

/**
 * @description renders a service status card with history bars in StatisticsCard style
 * @param {service_card_props} props
 * @returns {JSX.Element}
 */
function ServiceCard({ icon_name, name, value, detail, status, bars, border_bottom = false, loading = false }: service_card_props) {
  const badge_color = status === 'operational' ? 'bg-emerald-400/10'
                    : status === 'degraded'    ? 'bg-amber-400/10'
                    : status === 'incident'    ? 'bg-red-400/10'
                    :                            'bg-muted/50'
  const badge_icon  = status === 'operational' ? 'solar:course-up-bold-duotone'
                    : status === 'degraded'    ? 'solar:course-down-bold-duotone'
                    : status === 'incident'    ? 'solar:course-down-bold-duotone'
                    :                            'solar:question-circle-bold-duotone'

  return (
    <div className={`lg:w-1/3 md:w-1/2 w-full border-e border-border lg:[&:nth-child(3n)]:border-e-0 md:[&:nth-child(2n)]:max-lg:border-e-0 ${border_bottom ? 'border-b' : ''}`}>
      <div className="p-6 flex flex-col gap-1 h-full">
        <div className="flex justify-between items-start">
          <h5 className="text-base font-medium">{name}</h5>
          <div className="p-3 rounded-full outline outline-border text-primary">
            <Icon icon={icon_name} width={16} height={16} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <h5 className="text-2xl font-semibold tabular-nums">{value}</h5>
          )}
          <div className="flex items-center gap-2">
            {loading ? (
              <Skeleton className="h-3 w-32" />
            ) : (
              <>
                <p className="text-xs text-muted-foreground truncate">{detail}</p>
                <Badge className={`${badge_color} text-muted-foreground shrink-0 border-0`}>
                  <div className="flex items-center gap-1">
                    {status_label(status)}
                    <Icon icon={badge_icon} width={14} height={14} />
                  </div>
                </Badge>
              </>
            )}
          </div>
        </div>
        {!loading && (
          <>
            <div className="flex items-end gap-px h-6 mt-3">
              {bars.map((b, i) => {
                const bt = status_theme(b)
                const ht = b === 'operational' ? '100%' : b === 'degraded' ? '60%' : '30%'
                return (
                  <div
                    key       = {i}
                    title     = {status_label(b)}
                    className = {`flex-1 rounded-sm ${bt.bar} transition-all duration-300`}
                    style     = {{ height: ht, opacity: 0.6 + (i / bars.length) * 0.4 }}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground/50">{__bar_count}s ago</span>
              <span className="text-[10px] text-muted-foreground/50">now</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// - OVERALL HERO SECTION - \\

interface overall_hero_props {
  status    : service_status
  since_str : string
  loading   : boolean
}

/**
 * @description renders the overall status hero with animated pulse ring
 * @param {overall_hero_props} props
 * @returns {JSX.Element}
 */
function OverallHero({ status, since_str, loading }: overall_hero_props) {
  const theme = status_theme(status)
  const title = status === 'operational' ? 'All Systems Operational'
              : status === 'degraded'   ? 'Partial Degradation Detected'
              : status === 'incident'   ? 'System Outage Detected'
              : 'Connecting to systems...'

  return (
    <div className="flex flex-col items-center py-10 gap-5">
      {loading ? (
        <>
          <Skeleton className="w-[72px] h-[72px] rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-44" />
          </div>
        </>
      ) : (
        <>
          <div className="relative flex items-center justify-center">
            {status !== 'unknown' && (
              <div className={`absolute w-[72px] h-[72px] rounded-full ${theme.dot} opacity-[0.08] animate-ping`} />
            )}
            <div className={`absolute w-[60px] h-[60px] rounded-full ${theme.dot} opacity-[0.12]`} />
            <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center border-2 ${
              status === 'operational' ? 'bg-emerald-500/20 border-emerald-500/40'
            : status === 'degraded'   ? 'bg-amber-500/20  border-amber-500/40'
            : status === 'incident'   ? 'bg-red-500/20    border-red-500/40'
            :                           'bg-muted border-border'
            }`}>
              <StatusIcon status={status} size="w-7 h-7" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Last checked <span className="text-foreground font-medium">{since_str}</span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// - MINI STAT CARD - \\

interface mini_stat_props {
  label    : string
  value    : string
  sub     ?: string
  icon_name: string
  status  ?: service_status
  loading  : boolean
}

/**
 * @description renders a compact metric cell for the snapshot grid in StatisticsCard style
 * @param {mini_stat_props} props
 * @returns {JSX.Element}
 */
function MiniStat({ label, value, sub, icon_name, status, loading }: mini_stat_props) {
  const badge_color = status === 'operational' ? 'bg-emerald-400/10'
                    : status === 'degraded'    ? 'bg-amber-400/10'
                    : status === 'incident'    ? 'bg-red-400/10'
                    :                            'bg-muted/50'
  const badge_icon  = status === 'operational' ? 'solar:course-up-bold-duotone'
                    : status === 'degraded'    ? 'solar:course-down-bold-duotone'
                    : status === 'incident'    ? 'solar:course-down-bold-duotone'
                    :                            'solar:question-circle-bold-duotone'

  return (
    <div className="lg:w-1/4 md:w-1/2 w-full border-e border-border lg:[&:nth-child(4n)]:border-e-0 md:[&:nth-child(2n)]:max-lg:border-e-0">
      <div className="p-5 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <h5 className="text-sm font-medium">{label}</h5>
          <div className="p-2.5 rounded-full outline outline-border text-primary">
            <Icon icon={icon_name} width={14} height={14} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <h5 className="text-xl font-semibold tabular-nums">{value}</h5>
          )}
          {(sub || status) && (
            <div className="flex items-center gap-2">
              {loading ? (
                <Skeleton className="h-3 w-24" />
              ) : (
                <>
                  {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                  {status && (
                    <Badge className={`${badge_color} text-muted-foreground shrink-0 border-0`}>
                      <div className="flex items-center gap-1">
                        {status_label(status)}
                        <Icon icon={badge_icon} width={12} height={12} />
                      </div>
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// - PAGE - \\

export default function BotStatsPage() {
  const [stats, set_stats]         = useState<bot_stats | null>(null)
  const [history, set_history]     = useState<history_point[]>([])
  const [connected, set_connected] = useState(false)
  const [loading, set_loading]     = useState(true)
  const [scrolled, set_scrolled]   = useState(false)
  const event_source_ref           = useRef<EventSource | null>(null)

  // - 实时运行时间计时器引用 - \\
  // - ref storing last-received uptime anchor for local tick - \\
  const uptime_ref                     = useRef<{ seconds: number; sampled_at: number }>({ seconds: 0, sampled_at: 0 })
  const [live_uptime, set_live_uptime] = useState('\u2014')
  const [since_str,   set_since_str]   = useState('\u2014')

  // - 将新快照追加到滚动历史窗口 - \\
  // - append new snapshot to the rolling history window - \\
  const push_to_history = useCallback((s: bot_stats) => {
    const point: history_point = {
      time       : fmt_time(s.sampled_at),
      ws_ping    : s.ws_ping    >= 0 ? s.ws_ping    : 0,
      api_latency: s.api_latency >= 0 ? s.api_latency : 0,
      db_latency : s.db_latency  >= 0 ? s.db_latency  : 0,
      heap_mb    : s.memory.heap_used_mb,
      rss_mb     : s.memory.rss_mb,
    }
    set_history(prev => {
      const next = [...prev, point]
      return next.length > __max_history ? next.slice(next.length - __max_history) : next
    })
  }, [])

  // - 锚定运行时间基础值 - \\
  // - anchor uptime ref whenever fresh stats arrive - \\
  useEffect(() => {
    if (!stats) return
    uptime_ref.current = { seconds: stats.uptime, sampled_at: stats.sampled_at }
  }, [stats])

  // - 本地运行时间计时器，每 500ms 更新一次 - \\
  // - local uptime ticker increments every 500ms without waiting for SSE - \\
  useEffect(() => {
    const tick = () => {
      const { seconds, sampled_at } = uptime_ref.current
      if (sampled_at === 0) return
      const elapsed = (Date.now() - sampled_at) / 1000
      set_live_uptime(format_uptime(Math.max(0, seconds + elapsed)))
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [])

  // - 实时"上次采样"时间差，每 250ms 更新 - \\
  // - live "sampled Xs ago" counter, resets on each new snapshot - \\
  useEffect(() => {
    const tick = () => {
      if (!stats) { set_since_str('\u2014'); return }
      const sec = Math.floor((Date.now() - stats.sampled_at) / 1000)
      set_since_str(sec < 2 ? 'just now' : `${sec}s ago`)
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [stats])

  // - scroll listener for topbar shrink - \\
  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 16)
    window.addEventListener("scroll", on_scroll, { passive: true })
    return () => window.removeEventListener("scroll", on_scroll)
  }, [])

  // - 拉取初始快照 - \\
  // - load initial snapshot on mount - \\
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
  // - connect SSE stream for realtime updates - \\
  useEffect(() => {
    const es              = new EventSource('/api/bot-stats/stream')
    event_source_ref.current = es

    es.onopen    = () => set_connected(true)
    es.onerror   = () => set_connected(false)
    es.onmessage = (e) => {
      try {
        const data: bot_stats = JSON.parse(e.data)
        set_stats(data)
        push_to_history(data)
        set_loading(false)
      } catch {}
    }

    return () => {
      es.close()
      event_source_ref.current = null
    }
  }, [push_to_history])

  // - DERIVED STATUS - \\

  const mem_pct = stats
    ? Math.round((stats.memory.heap_used_mb / 1024) * 100)
    : 0

  const ws_status     = stats    ? ms_to_status(stats.ws_ping)    : 'unknown' as service_status
  const api_status    = stats    ? ms_to_status(stats.api_latency) : 'unknown' as service_status
  const db_status     = stats    ? ms_to_status(stats.db_latency)  : 'unknown' as service_status
  const heap_status   = stats
    ? (mem_pct < 70 ? 'operational' : mem_pct < 90 ? 'degraded' : 'incident') as service_status
    : 'unknown' as service_status
  const uptime_status = stats && stats.status === 'alive'
    ? 'operational' as service_status
    : 'incident'    as service_status
  const sse_status    = connected ? 'operational' as service_status
                      : loading   ? 'unknown'     as service_status
                      :             'incident'    as service_status

  const all_statuses   = [ws_status, api_status, db_status, heap_status, uptime_status, sse_status]
  const overall_status : service_status = all_statuses.includes('incident') ? 'incident'
    : all_statuses.includes('degraded') ? 'degraded'
    : all_statuses.includes('unknown')  ? 'unknown'
    : 'operational'

  // - BUILD HISTORY BARS PER SERVICE - \\

  const recent_bars = history.slice(-__bar_count)
  const ws_bars     = pad_bars(recent_bars.map(p => ms_to_status(p.ws_ping)))
  const api_bars    = pad_bars(recent_bars.map(p => ms_to_status(p.api_latency)))
  const db_bars     = pad_bars(recent_bars.map(p => ms_to_status(p.db_latency)))
  const heap_bars   = pad_bars(recent_bars.map(p => {
    const pct = (p.heap_mb / 1024) * 100
    return (pct < 70 ? 'operational' : pct < 90 ? 'degraded' : 'incident') as service_status
  }))
  const flat_bars   = (s: service_status): service_status[] =>
    pad_bars(recent_bars.map(() => s))

  // - chart tick label formatter - \\
  const tick_formatter = (v: string, i: number) => {
    if (history.length <= 10) return v
    return i % Math.ceil(history.length / 6) === 0 ? v : ''
  }

  return (
    <div
      className="min-h-screen bg-[#060608] text-white"
      style={{ letterSpacing: "-0.2px" }}
    >

      {/* - top blur gradient - */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-15 blur-3xl rounded-full z-0"
        style={{ background: "radial-gradient(ellipse, #5865F2 0%, transparent 70%)" }}
      />

      {/* - topbar — floating pill style - */}
      <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-300", scrolled ? "py-2" : "py-4")}>
        <div className="max-w-5xl mx-auto px-5">
          <nav
            className={cn(
              "flex items-center justify-between px-4 h-11 rounded-2xl border transition-all duration-300",
              scrolled
                ? "bg-[#0c0c0e]/90 border-white/[0.07] backdrop-blur-xl"
                : "bg-[#0c0c0e]/60 border-white/[0.05] backdrop-blur-md",
            )}
          >
            {/* - logo breadcrumb - */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AtomicLogo className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/50 font-medium">Atomic</span>
              <span className="text-[#2a2a2e] text-xs mx-0.5">/</span>
              <span className="text-sm text-white/30 font-medium">Bot Status</span>
            </Link>

            {/* - right: live indicator + status pill - */}
            <div className="flex items-center gap-3">
              {!loading && (
                <div className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
                  overall_status === 'operational' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : overall_status === 'degraded'  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : overall_status === 'incident'  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  :                                   "bg-white/5 border-white/10 text-white/30",
                )}>
                  <StatusIcon status={overall_status} size="w-3 h-3" />
                  <span className="hidden sm:inline">{status_label(overall_status)}</span>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* - page content - */}
      <main className="max-w-5xl mx-auto px-5 pt-28 lg:pt-36 pb-28 space-y-10 relative z-10">

        {/* - HERO SECTION - \\ */}
        <OverallHero
          status    = {loading ? 'unknown' : overall_status}
          since_str = {since_str}
          loading   = {loading}
        />

        {/* - SERVICE STATUS GRID - \\ */}
        <section>
          <Card className="p-0">
            <CardContent className="flex items-stretch w-full flex-wrap px-0 py-0">
              <ServiceCard
                icon_name     = "solar:wi-fi-router-minimalistic-bold"
                name          = "Discord Gateway"
                value         = {stats ? fmt_ms(stats.ws_ping) : '\u2014'}
                detail        = "WebSocket latency"
                status        = {ws_status}
                bars          = {ws_bars}
                border_bottom = {true}
                loading       = {loading}
              />
              <ServiceCard
                icon_name     = "solar:bolt-bold-duotone"
                name          = "REST API"
                value         = {stats ? fmt_ms(stats.api_latency) : '\u2014'}
                detail        = "HTTP round-trip"
                status        = {api_status}
                bars          = {api_bars}
                border_bottom = {true}
                loading       = {loading}
              />
              <ServiceCard
                icon_name     = "solar:database-bold-duotone"
                name          = "PostgreSQL"
                value         = {stats ? fmt_ms(stats.db_latency) : '\u2014'}
                detail        = "Query latency"
                status        = {db_status}
                bars          = {db_bars}
                border_bottom = {true}
                loading       = {loading}
              />
              <ServiceCard
                icon_name = "solar:cpu-bold-duotone"
                name      = "Bot Process"
                value     = {stats ? `${mem_pct}%` : '\u2014'}
                detail    = {stats ? `${stats.memory.heap_used_mb} MB / 1 GB` : 'Connecting...'}
                status    = {heap_status}
                bars      = {heap_bars}
                loading   = {loading}
              />
              <ServiceCard
                icon_name = "solar:clock-circle-bold-duotone"
                name      = "Runtime Uptime"
                value     = {stats && stats.status === 'alive' ? live_uptime : 'Offline'}
                detail    = {stats?.status === 'alive' ? 'Bot is online' : 'Bot is offline'}
                status    = {uptime_status}
                bars      = {flat_bars(uptime_status)}
                loading   = {loading}
              />
              <ServiceCard
                icon_name = "solar:radio-minimalistic-bold-duotone"
                name      = "Event Stream"
                value     = {connected ? 'Active' : 'Offline'}
                detail    = {connected ? `SSE \u00b7 ${since_str}` : 'Disconnected'}
                status    = {sse_status}
                bars      = {flat_bars(sse_status)}
                loading   = {loading}
              />
            </CardContent>
          </Card>
        </section>

        {/* - CHARTS SECTION - \\ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* - response time line chart - \\ */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon icon="solar:chart-2-bold-duotone" width={16} height={16} className="text-muted-foreground" />
                    Response Time
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    last {__max_history}s at 1s resolution
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-blue-400   inline-block rounded-full" />WS</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-violet-400 inline-block rounded-full" />API</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-emerald-400 inline-block rounded-full" />DB</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey       = "time"
                      tick          = {{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine      = {false}
                      axisLine      = {false}
                      tickFormatter = {tick_formatter}
                    />
                    <YAxis
                      tick     = {{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine = {false}
                      axisLine = {false}
                      unit     = "ms"
                    />
                    <Tooltip content={chart_tooltip} />
                    <Line
                      type               = "monotone"
                      dataKey            = "ws_ping"
                      name               = "WS Ping"
                      stroke             = "#60a5fa"
                      strokeWidth        = {1.5}
                      dot                = {false}
                      activeDot          = {{ r: 3, fill: '#60a5fa' }}
                      isAnimationActive  = {false}
                    />
                    <Line
                      type               = "monotone"
                      dataKey            = "api_latency"
                      name               = "API"
                      stroke             = "#a78bfa"
                      strokeWidth        = {1.5}
                      dot                = {false}
                      activeDot          = {{ r: 3, fill: '#a78bfa' }}
                      isAnimationActive  = {false}
                    />
                    <Line
                      type               = "monotone"
                      dataKey            = "db_latency"
                      name               = "DB"
                      stroke             = "#34d399"
                      strokeWidth        = {1.5}
                      dot                = {false}
                      activeDot          = {{ r: 3, fill: '#34d399' }}
                      isAnimationActive  = {false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* - memory area chart - \\ */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon icon="solar:server-bold-duotone" width={16} height={16} className="text-muted-foreground" />
                    Memory Usage
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    heap &amp; RSS over {__max_history}s
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-amber-400  inline-block rounded-full" />Heap</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-px bg-orange-400 inline-block rounded-full" />RSS</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad_heap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="grad_rss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#fb923c" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey       = "time"
                      tick          = {{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine      = {false}
                      axisLine      = {false}
                      tickFormatter = {tick_formatter}
                    />
                    <YAxis
                      tick     = {{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
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
                      strokeWidth = {1.5}
                      fill        = "url(#grad_heap)"
                    />
                    <Area
                      type        = "monotone"
                      dataKey     = "rss_mb"
                      name        = "RSS MB"
                      stroke      = "#fb923c"
                      strokeWidth = {1.5}
                      fill        = "url(#grad_rss)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* - METRICS SNAPSHOT GRID - \\ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground">Current Snapshot</h2>
            <div className="flex-1 h-px bg-border ml-2" />
            <span className="text-xs text-muted-foreground">{since_str}</span>
          </div>
          <Card className="p-0">
            <CardContent className="flex items-stretch w-full flex-wrap px-0 py-0">
              <MiniStat
                label     = "WS Ping"
                value     = {stats ? fmt_ms(stats.ws_ping) : '\u2014'}
                sub       = "WebSocket latency"
                icon_name = "solar:user-speak-line-duotone"
                status    = {ws_status}
                loading   = {loading}
              />
              <MiniStat
                label     = "API Latency"
                value     = {stats ? fmt_ms(stats.api_latency) : '\u2014'}
                sub       = "HTTP round-trip"
                icon_name = "solar:bolt-bold-duotone"
                status    = {api_status}
                loading   = {loading}
              />
              <MiniStat
                label     = "DB Latency"
                value     = {stats ? fmt_ms(stats.db_latency) : '\u2014'}
                sub       = "PostgreSQL ping"
                icon_name = "solar:database-bold-duotone"
                status    = {db_status}
                loading   = {loading}
              />
              <MiniStat
                label     = "Heap Used"
                value     = {stats ? `${mem_pct}%` : '\u2014'}
                sub       = {stats ? `${stats.memory.heap_used_mb} MB / 1 GB` : undefined}
                icon_name = "solar:cpu-bold-duotone"
                status    = {heap_status}
                loading   = {loading}
              />
              <MiniStat
                label     = "RSS"
                value     = {stats ? `${stats.memory.rss_mb} MB` : '\u2014'}
                sub       = "Resident set size"
                icon_name = "solar:server-bold-duotone"
                loading   = {loading}
              />
              <MiniStat
                label     = "External Mem"
                value     = {stats ? `${stats.memory.external_mb} MB` : '\u2014'}
                sub       = "C++ objects and buffers"
                icon_name = "solar:layers-minimalistic-bold-duotone"
                loading   = {loading}
              />
              <MiniStat
                label     = "Uptime"
                value     = {stats ? live_uptime : '\u2014'}
                sub       = {stats?.status === 'alive' ? 'Bot is online' : 'Bot offline'}
                icon_name = "solar:clock-circle-bold-duotone"
                status    = {uptime_status}
                loading   = {loading}
              />
              <MiniStat
                label     = "Event Stream"
                value     = {connected ? 'Connected' : 'Offline'}
                sub       = {connected ? `SSE \u00b7 ${since_str}` : 'Reconnecting...'}
                icon_name = "solar:radio-minimalistic-bold-duotone"
                status    = {sse_status}
                loading   = {loading}
              />
            </CardContent>
          </Card>
        </section>

        {/* - SERVICE DISRUPTION BANNER - \\ */}
        {!loading && (ws_status === 'incident' || api_status === 'incident') && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <Icon icon="solar:expressionless-square-bold" width={16} height={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-400">Service disruption detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One or more services are unreachable. Stats will recover automatically when connectivity is restored.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
