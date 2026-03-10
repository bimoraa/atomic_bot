/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, use }                              from 'react'
import { cn }                                                    from '@/lib/utils'
import { Skeleton }                                              from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle }          from '@/components/ui/sheet'
import { XCircle, ChevronRight }                                 from 'lucide-react'
import type { prodete_report, prodete_entry }                    from '@/types/prodete'

// - RANK MEDAL COLORS - \\
function rank_class(rank: number): string {
  if (rank === 1) return 'text-yellow-400 font-bold'
  if (rank === 2) return 'text-zinc-400  font-bold'
  if (rank === 3) return 'text-amber-600 font-bold'
  return 'text-muted-foreground'
}

function pct_bar(pct: string): number {
  return Math.min(100, parseFloat(pct))
}

// - FORMAT SECONDS TO "Xh Ym" OR "Ym" - \\
function format_voice(seconds: number | undefined): string {
  const s = seconds ?? 0
  if (!s || isNaN(s) || s <= 0) return '-'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0)          return `${h}h`
  return `${m}m`
}

function ch_label(id: string, names: Record<string, string>): string {
  return names[id] ?? id
}

interface page_props {
  params: Promise<{ slug: string }>
}

// - DETAIL SHEET COMPONENT - \\
function DetailSheet({
  entry,
  open,
  on_close,
  channel_names,
}: {
  entry         : prodete_entry | null
  open          : boolean
  on_close      : () => void
  channel_names : Record<string, string>
}) {
  if (!entry) return null

  const ch_rows     = Object.entries(entry.channel_breakdown).sort(([, a], [, b]) => b - a)
  const ticket_rows = Object.entries(entry.ticket_breakdown).sort(([, a], [, b]) => b - a)
  const answer_rows = Object.entries(entry.answer_breakdown).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) on_close() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-background border-border">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-base font-semibold">
            {entry.username}
            <span className="ml-2 text-xs font-mono text-muted-foreground/50">#{entry.rank}</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground font-mono">{entry.user_id}</p>
        </SheetHeader>

        {/* - SUMMARY ROW - \\ */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Total', val: entry.total },
            { label: 'Pesan', val: entry.msg_count },
            { label: 'Claim', val: entry.claim_count },
            { label: 'Ask',   val: entry.answer_count },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{val.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* - VOICE TIME STAT - \ */}
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Voice Time</p>
          <p className="text-sm font-semibold tabular-nums">
            {format_voice(entry.voice_seconds)}
            <span className="ml-2 text-xs text-muted-foreground/60 font-normal">
              ({(entry.voice_count ?? 0)} pts)
            </span>
          </p>
        </div>

        {/* - MESSAGES PER CHANNEL - \\ */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Pesan per Channel
          </h3>
          {ch_rows.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 italic">No data</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent *:border-border [&>:not(:last-child)]:border-r">
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground">Channel</TableHead>
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground text-right w-20">Pesan</TableHead>
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground w-28">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ch_rows.map(([ch_id, count]) => {
                    const share = entry.msg_count > 0 ? (count / entry.msg_count) * 100 : 0
                    return (
                      <TableRow key={ch_id} className="*:border-border [&>:not(:last-child)]:border-r">
                        <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                          {ch_label(ch_id, channel_names)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right tabular-nums font-medium">
                          {count.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-foreground/50 rounded-full"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right shrink-0">
                              {share.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* - TICKET CLAIMS BY TYPE - \\ */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Ticket Claims
          </h3>
          {ticket_rows.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 italic">No claims</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent *:border-border [&>:not(:last-child)]:border-r">
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground">Type</TableHead>
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground text-right w-20">Claims</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticket_rows.map(([type, count]) => (
                    <TableRow key={type} className="*:border-border [&>:not(:last-child)]:border-r">
                      <TableCell className="py-2 text-xs capitalize text-muted-foreground">{type}</TableCell>
                      <TableCell className="py-2 text-xs text-right tabular-nums font-medium">
                        {count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="*:border-border [&>:not(:last-child)]:border-r bg-muted/50">
                    <TableCell className="py-2 text-xs font-semibold">Total</TableCell>
                    <TableCell className="py-2 text-xs text-right tabular-nums font-semibold">
                      {entry.claim_count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* - ASK ANSWERS BY WEEK - \\ */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Ask Answers per Week
          </h3>
          {answer_rows.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 italic">No answers</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent *:border-border [&>:not(:last-child)]:border-r">
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground">Week</TableHead>
                    <TableHead className="bg-muted py-2 text-xs font-medium text-foreground text-right w-20">Answers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answer_rows.map(([week, count]) => (
                    <TableRow key={week} className="*:border-border [&>:not(:last-child)]:border-r">
                      <TableCell className="py-2 text-xs font-mono text-muted-foreground">{week}</TableCell>
                      <TableCell className="py-2 text-xs text-right tabular-nums font-medium">
                        {count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="*:border-border [&>:not(:last-child)]:border-r bg-muted/50">
                    <TableCell className="py-2 text-xs font-semibold">Total</TableCell>
                    <TableCell className="py-2 text-xs text-right tabular-nums font-semibold">
                      {entry.answer_count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </SheetContent>
    </Sheet>
  )
}

// - MAIN PAGE - \\
export default function ProDetePage({ params }: page_props) {
  const { slug }                              = use(params)
  const [report, set_report]                  = useState<prodete_report | null>(null)
  const [loading, set_loading]                = useState(true)
  const [error, set_error]                    = useState<string | null>(null)
  const [selected_entry, set_selected_entry]  = useState<prodete_entry | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/prodete/${slug}`)

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          set_error(data.error || 'Report not found.')
          return
        }

        const data: prodete_report = await res.json()
        set_report(data)
      } catch {
        set_error('Network error. Please try again.')
      } finally {
        set_loading(false)
      }
    }

    load()
  }, [slug])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        {/* - PAGE HEADER - \\ */}
        <div className="mb-8 space-y-1">
          {loading ? (
            <>
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40 mt-2" />
            </>
          ) : error ? null : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">ProDeTe</h1>
              <p className="text-sm text-muted-foreground">
                Data Keaktifan Staff &mdash; {report!.from_date} s/d {report!.to_date}
              </p>
              <p className="text-xs text-muted-foreground/50">
                Updated{' '}
                <span title={new Date(report!.generated_at).toISOString()}>
                  {new Date(report!.generated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                </span>
                &ensp;&bull;&ensp;{report!.entries.length} staff
              </p>
            </>
          )}
        </div>

        {/* - ERROR STATE - \\ */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <XCircle className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* - SKELETON TABLE - \\ */}
        {loading && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="*:border-border [&>:not(:last-child)]:border-r hover:bg-transparent">
                  {['#', 'Staff', 'Pesan', 'Claim', 'Ask', 'Total', '%', ''].map((_, i) => (
                    <TableHead key={i} className="bg-muted py-2.5">
                      <Skeleton className="h-4 w-10" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="*:border-border [&>:not(:last-child)]:border-r">
                    <TableCell className="py-3 w-10"><Skeleton className="h-4 w-5" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* - DATA TABLE - \\ */}
        {!loading && !error && report && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="*:border-border [&>:not(:last-child)]:border-r hover:bg-transparent">
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-12">#</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground">Staff</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-24 text-right">Pesan</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-20 text-right">Claim</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-20 text-right">Ask</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-20 text-right">Voice</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-24 text-right">Total</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-36">%</TableHead>
                  <TableHead className="bg-muted py-2.5 w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.entries.map((entry: prodete_entry) => (
                  <TableRow
                    key={entry.user_id}
                    className="*:border-border [&>:not(:last-child)]:border-r"
                  >
                    <TableCell className={cn('py-2.5 text-sm text-center', rank_class(entry.rank))}>
                      {entry.rank}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-sm font-medium">{entry.username}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground/50 font-mono">
                        {entry.user_id.slice(-5)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums text-muted-foreground">
                      {entry.msg_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums text-muted-foreground">
                      {entry.claim_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums text-muted-foreground">
                      {entry.answer_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums text-muted-foreground">
                      {format_voice(entry.voice_seconds)}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums font-medium">
                      {entry.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/70 rounded-full"
                            style={{ width: `${pct_bar(entry.percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-12 text-right shrink-0">
                          {entry.percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <button
                        onClick={() => set_selected_entry(entry)}
                        className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Detail
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* - LEGEND - \\ */}
        {!loading && !error && report && (
          <p className="mt-4 text-xs text-muted-foreground/30 text-center">
            by Bryan n Lendowsky. UUID: {report.slug}
          </p>
        )}

      </div>

      {/* - DETAIL DRAWER - \\ */}
      <DetailSheet
        entry         = {selected_entry}
        open          = {selected_entry !== null}
        on_close      = {() => set_selected_entry(null)}
        channel_names = {report?.channel_names ?? {}}
      />
    </div>
  )
}

