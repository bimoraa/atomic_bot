/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useManageContext }                            from '../context'
import { Button }                                     from '@/components/ui/button'
import { Badge }                                      from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
}                                                     from '@/components/ui/dialog'
import { ScrollArea }                                 from '@/components/ui/scroll-area'
import { Loader2, ChevronDown, CheckCircle2,
         XCircle, Search, Filter }                    from 'lucide-react'
import { Skeleton }                                   from '@/components/ui/skeleton'
import { cn }                                         from '@/lib/utils'

// - TYPES - \\

interface bypass_log_row {
  id         : number
  guild_id   : string
  user_id    : string
  user_tag   : string
  avatar     : string | null
  url        : string
  result_url : string | null
  success    : boolean
  created_at : string
}

interface logs_response {
  logs  : bypass_log_row[]
  total : number
}

// - HELPERS - \\

const __avatar_url = (user_id: string, avatar: string | null): string =>
  avatar
    ? `https://cdn.discordapp.com/avatars/${user_id}/${avatar}.webp?size=32`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user_id) % 5}.png`

const __fmt_date = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month  : 'short',
    day    : 'numeric',
    year   : 'numeric',
    hour   : '2-digit',
    minute : '2-digit',
  })

const __truncate = (url: string, max = 48): string =>
  url.length > max ? `${url.slice(0, max)}...` : url

// - DETAILS DIALOG - \\

function DetailsDialog({ log }: { log: bypass_log_row }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label : 'User',
      value : (
        <span className="flex items-center gap-1.5">
          <img
            src={__avatar_url(log.user_id, log.avatar)}
            alt={log.user_tag}
            className="w-4 h-4 rounded-full"
          />
          {log.user_tag}
        </span>
      ),
    },
    { label: 'User ID',       value: <span className="font-mono text-xs">{log.user_id}</span> },
    {
      label : 'Requested URL',
      value : (
        <a
          href={log.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-primary underline-offset-2 hover:underline break-all"
        >
          {log.url}
        </a>
      ),
    },
    {
      label : 'Result URL',
      value : log.result_url ? (
        <a
          href={log.result_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-primary underline-offset-2 hover:underline break-all"
        >
          {log.result_url}
        </a>
      ) : <span className="text-muted-foreground text-xs">N/A</span>,
    },
    {
      label : 'Status',
      value : log.success
        ? <Badge variant="outline" className="text-xs font-normal border-green-800 text-green-400 bg-green-900/20">Success</Badge>
        : <Badge variant="outline" className="text-xs font-normal border-red-800 text-red-400 bg-red-900/20">Failed</Badge>,
    },
    { label: 'Date', value: <span className="text-xs">{__fmt_date(log.created_at)}</span> },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <img
              src={__avatar_url(log.user_id, log.avatar)}
              alt={log.user_tag}
              className="w-6 h-6 rounded-full"
            />
            {log.user_tag}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[420px]">
          <div className="px-5 py-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {rows.map(r => (
                  <tr key={r.label}>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground font-medium w-32 align-top">{r.label}</td>
                    <td className="py-2.5 text-foreground align-top">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// - PAGE - \\

const __page_size = 30

export default function LogPage() {
  const { guild_id } = useManageContext()

  const [logs, set_logs]           = useState<bypass_log_row[]>([])
  const [total, set_total]         = useState(0)
  const [offset, set_offset]       = useState(0)
  const [loading, set_loading]     = useState(true)
  const [loading_more, set_more]   = useState(false)
  const [search, set_search]       = useState('')
  const [filter, set_filter]       = useState<'all' | 'success' | 'failed'>('all')

  const fetch_logs = useCallback(async (off: number, append = false) => {
    append ? set_more(true) : set_loading(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/logs?limit=${__page_size}&offset=${off}`)
      if (!r.ok) return
      const data: logs_response = await r.json()
      set_logs(prev => append ? [...prev, ...data.logs] : data.logs)
      set_total(data.total)
    } catch {
      // - non-critical - \\
    } finally {
      append ? set_more(false) : set_loading(false)
    }
  }, [guild_id])

  useEffect(() => {
    fetch_logs(0)
    set_offset(0)
  }, [fetch_logs])

  const load_more = () => {
    const next = offset + __page_size
    set_offset(next)
    fetch_logs(next, true)
  }

  const filtered = useMemo(() => {
    let result = logs
    if (filter === 'success') result = result.filter(l => l.success)
    if (filter === 'failed')  result = result.filter(l => !l.success)
    if (search.trim()) {
      const q = search.toLowerCase()
      result  = result.filter(l => l.user_tag.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
    }
    return result
  }, [logs, filter, search])

  if (loading) return (
    <div className="px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* HEADER SKELETON */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-9 w-[180px] rounded-xl" />
        </div>
      </div>

      {/* TABLE SKELETON */}
      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="h-11 border-b border-border/40 bg-muted/20 flex items-center px-4">
          <div className="w-[30%]">
             <Skeleton className="h-4 w-16" />
          </div>
           <div className="w-[40%] hidden sm:block">
             <Skeleton className="h-4 w-24" />
          </div>
           <div className="w-[15%]">
             <Skeleton className="h-4 w-12" />
          </div>
           <div className="w-[15%] hidden md:block">
             <Skeleton className="h-4 w-10" />
          </div>
        </div>

        <div className="divide-y divide-border/40 flex flex-col">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center px-4 py-3 h-[52px]">
              <div className="w-[30%] flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <div className="w-[40%] hidden sm:block pr-4">
                <Skeleton className="h-4 w-full max-w-[200px] rounded-md" />
              </div>
              <div className="w-[15%]">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="w-[15%] hidden md:block">
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">

      {/* - HEADER - \\ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} total entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* - SEARCH - \\ */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => set_search(e.target.value)}
              placeholder="Search user or URL..."
              className="h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-muted/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-full sm:w-64 transition-all"
            />
          </div>

          {/* - FILTER - \\ */}
          <div className="flex items-center gap-1 bg-muted/30 border border-border/60 rounded-xl p-1 shrink-0">
            {(['all', 'success', 'failed'] as const).map(f => (
              <button
                key={f}
                onClick={() => set_filter(f)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  filter === f
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {f === 'all' ? 'All' : f === 'success' ? 'Success' : 'Failed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* - TABLE - \\ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card/50 border border-border/60 border-dashed rounded-2xl mx-1">
          <div className="w-12 h-12 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-muted-foreground/60" />
          </div>
          <p className="text-base font-medium text-foreground">No matches found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {search || filter !== 'all' ? 'Try adjusting your search query or filters.' : 'No bypass activity has been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-border/60 bg-card rounded-2xl shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">User</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5 hidden sm:table-cell">Requested URL</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5 hidden md:table-cell">Date</th>
                  <th className="px-5 py-3.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={__avatar_url(log.user_id, log.avatar)}
                          alt={log.user_tag}
                          className="w-8 h-8 rounded-full ring-1 ring-border/50 shrink-0"
                          loading="lazy"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[160px] text-foreground">{log.user_tag}</span>
                          <span className="text-[10px] text-muted-foreground truncate hidden sm:block">{log.user_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell w-full max-w-[300px]">
                      <div className="flex items-center">
                        <code className="font-mono text-xs px-2 py-1 bg-muted/40 rounded-md text-muted-foreground group-hover:bg-muted/60 transition-colors truncate border border-border/40 hover:text-foreground inline-block max-w-full">
                          {__truncate(log.url, 60)}
                        </code>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center">
                        {log.success
                          ? <Badge variant="outline" className="text-[11px] font-medium border-green-800/30 text-emerald-400 bg-emerald-500/10 gap-1.5 pl-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Success
                            </Badge>
                          : <Badge variant="outline" className="text-[11px] font-medium border-red-800/30 text-rose-400 bg-rose-500/10 gap-1.5 pl-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              Failed
                            </Badge>
                        }
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground text-xs font-medium">
                      {__fmt_date(log.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right opacity-80 group-hover:opacity-100 transition-opacity">
                      <DetailsDialog log={log} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length < total && (
            <div className="flex justify-center pt-2 pb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={load_more}
                disabled={loading_more}
                className="h-9 px-4 text-xs font-medium rounded-xl border border-border/80 bg-card hover:bg-muted/50 hover:text-foreground shadow-sm"
              >
                {loading_more
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Loading more...</>
                  : <><ChevronDown className="w-3.5 h-3.5 mr-2" />Load more ({total - logs.length} remaining)</>
                }
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
