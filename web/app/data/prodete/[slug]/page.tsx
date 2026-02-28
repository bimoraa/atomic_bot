'use client'

import { useEffect, useState }                                  from 'react'
import { cn }                                                   from '@/lib/utils'
import { Skeleton }                                             from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { XCircle }                                              from 'lucide-react'
import { use }                                                  from 'react'
import type { prodete_report, prodete_entry }                   from '@/types/prodete'

// - RANK MEDAL COLORS - \\
function rank_class(rank: number): string {
  if (rank === 1) return 'text-yellow-400 font-bold'
  if (rank === 2) return 'text-zinc-400  font-bold'
  if (rank === 3) return 'text-amber-600 font-bold'
  return 'text-muted-foreground'
}

// - BAR PERCENTAGE WIDTH - \\
function pct_bar(pct: string): number {
  return Math.min(100, parseFloat(pct))
}

interface page_props {
  params: Promise<{ slug: string }>
}

export default function ProDetePage({ params }: page_props) {
  const { slug }                            = use(params)
  const [report, set_report]                = useState<prodete_report | null>(null)
  const [loading, set_loading]              = useState(true)
  const [error, set_error]                  = useState<string | null>(null)

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

  const fmt_date = (dt: string) => dt // "DD-MM-YYYY" — already readable

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
                Data Keaktifan Staff &mdash; {fmt_date(report!.from_date)} s/d {fmt_date(report!.to_date)}
              </p>
              <p className="text-xs text-muted-foreground/50">
                Updated <span title={new Date(report!.generated_at).toISOString()}>
                  {new Date(report!.generated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                </span>
                &ensp;&bull;&ensp;{report!.entries.length} staff counted
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
                  {['#', 'Staff', 'Pesan', 'Claim', 'Ask', 'Total', '%'].map(h => (
                    <TableHead key={h} className="bg-muted py-2.5">
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
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-24 text-right">Total</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-36">%</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* - LEGEND - \\ */}
        {!loading && !error && report && (
          <p className="mt-4 text-xs text-muted-foreground/30 text-center">
            Pesan = messages in tracked channels &bull; Claim = priority/helper ticket claims &bull; Ask = ask-staff answers
          </p>
        )}

      </div>
    </div>
  )
}
