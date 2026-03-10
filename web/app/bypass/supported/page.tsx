/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useMemo }                         from 'react'
import { cn }                                                   from '@/lib/utils'
import { BypassTopbar }                                         from '@/components/layout/bypass_topbar'
import { Tabs, TabsList, TabsTrigger }                          from '@/components/ui/tabs'
import DarkVeil                                                 from '@/components/animations/dark_veil'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton }                                             from '@/components/ui/skeleton'
import { Search, XCircle }                                      from 'lucide-react'

interface supported_service {
  name    : string
  type    : string
  status  : string
  domains : string[]
}

// - STATUS DOT CONFIG - \\
const __status_dot: Record<string, string> = {
  active      : 'bg-foreground',
  maintenance : 'bg-amber-400',
  inactive    : 'bg-muted-foreground/30',
}

function __get_dot(status: string): string {
  return __status_dot[status.toLowerCase()] ?? __status_dot.inactive
}

// - UNIQUE TYPES FROM DATA - \\
function __get_types(services: supported_service[]): string[] {
  const types = Array.from(new Set(services.map(s => s.type.toLowerCase())))
  return types.sort()
}

export default function SupportedPage() {
  const [services, set_services] = useState<supported_service[]>([])
  const [query, set_query]       = useState('')
  const [tab, set_tab]           = useState<string>('all')
  const [loading, set_loading]   = useState(true)
  const [error, set_error]       = useState<string | null>(null)

  useEffect(() => {
    const fetch_services = async () => {
      try {
        const res = await fetch('/api/supported')

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          set_error(data.error || 'Failed to load supported services.')
          return
        }

        const data: supported_service[] = await res.json()
        set_services(data)
      } catch {
        set_error('Network error. Please try again.')
      } finally {
        set_loading(false)
      }
    }

    fetch_services()
  }, [])

  const types    = useMemo(() => __get_types(services), [services])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter(s => {
      const match_tab = tab === 'all' || s.type.toLowerCase() === tab
      const match_q   = !q
        || s.name.toLowerCase().includes(q)
        || s.type.toLowerCase().includes(q)
        || s.domains.some(d => d.toLowerCase().includes(q))
      return match_tab && match_q
    })
  }, [services, query, tab])

  const active_count = services.filter(s => s.status.toLowerCase() === 'active').length

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.9} scanlineFrequency={0} warpAmount={0} />
      </div>

      <div className="relative z-10">
        <BypassTopbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* - PAGE HEADER - \\ */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Supported Links</h1>
              {loading && <Skeleton className="h-4 w-36" />}
              {!loading && !error && (
                <p className="text-sm text-muted-foreground">
                  {active_count} active out of {services.length} services
                </p>
              )}
            </div>

            {/* - SEARCH - \\ */}
            {loading && <Skeleton className="h-9 w-64 rounded-xl" />}
            {!loading && !error && services.length > 0 && (
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-full max-w-xs focus-within:border-foreground/25 transition-colors">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => set_query(e.target.value)}
                  placeholder="Search by name, domain..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 min-w-0"
                />
                {query && (
                  <button
                    onClick={() => set_query('')}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* - TYPE FILTER TABS - \\ */}
          {loading && (
            <div className="mt-6 flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-lg" />
              ))}
            </div>
          )}
          {!loading && !error && types.length > 1 && (
            <div className="mt-6">
              <Tabs value={tab} onValueChange={set_tab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  {types.map(t => (
                    <TabsTrigger key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {/* - LOADING SKELETON - \\ */}
        {loading && (
          <div className="space-y-3">
            {/* - TABLE SKELETON - \\ */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="*:border-border [&>:not(:last-child)]:border-r hover:bg-transparent">
                    <TableHead className="bg-muted py-2.5 w-[180px]"><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="bg-muted py-2.5 w-[100px]"><Skeleton className="h-4 w-10" /></TableHead>
                    <TableHead className="bg-muted py-2.5 w-[100px]"><Skeleton className="h-4 w-12" /></TableHead>
                    <TableHead className="bg-muted py-2.5"><Skeleton className="h-4 w-20" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="*:border-border [&>:not(:last-child)]:border-r">
                      <TableCell className="py-3"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1.5">
                          <Skeleton className="h-5 w-20 rounded" />
                          <Skeleton className="h-5 w-16 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* - ERROR STATE - \\ */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <XCircle className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* - EMPTY SEARCH - \\ */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Search className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
            <button
              onClick={() => { set_query(''); set_tab('all') }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* - SERVICE TABLE - \\ */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="*:border-border [&>:not(:last-child)]:border-r hover:bg-transparent">
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-[180px]">Service</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-[100px]">Type</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground w-[100px]">Status</TableHead>
                  <TableHead className="bg-muted py-2.5 font-medium text-foreground">Domains</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((service, i) => (
                  <TableRow
                    key={`${service.name}-${i}`}
                    className="*:border-border [&>:not(:last-child)]:border-r"
                  >
                    <TableCell className="py-2.5 font-medium text-sm">{service.name}</TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground capitalize">{service.type}</TableCell>
                    <TableCell className="py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', __get_dot(service.status))} />
                        <span className="text-sm text-muted-foreground capitalize">
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1).toLowerCase()}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {service.domains.map(d => (
                          <span
                            key={d}
                            className="text-xs font-mono bg-secondary text-muted-foreground rounded px-1.5 py-0.5"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* - FOOTER - \\ */}
        {!loading && !error && services.length > 0 && (
          <p className="mt-8 text-xs text-muted-foreground/30 text-center">
            Updated every 5 minutes
          </p>
        )}

      </div>
      </div>
    </div>
  )
}


