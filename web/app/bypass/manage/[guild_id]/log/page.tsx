'use client'

import { useEffect, useState, useCallback } from 'react'
import { useManageContext }                  from '../context'
import { Button }                            from '@/components/ui/button'
import { Badge }                             from '@/components/ui/badge'
import { ScrollArea }                        from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
}                                            from '@/components/ui/dialog'
import { Loader2, ChevronDown }              from 'lucide-react'

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

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-8">
      <Loader2 className="w-3 h-3 animate-spin" />
      Loading logs...
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bypass Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} total entries
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No bypass activity yet.</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Requested Link</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Result</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={__avatar_url(log.user_id, log.avatar)}
                          alt={log.user_tag}
                          className="w-6 h-6 rounded-full shrink-0"
                          loading="lazy"
                        />
                        <span className="text-xs font-medium truncate max-w-[120px]">{log.user_tag}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {__truncate(log.url)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {log.success
                        ? <Badge variant="outline" className="text-[10px] font-normal border-green-800 text-green-400 bg-green-900/20">Success</Badge>
                        : <Badge variant="outline" className="text-[10px] font-normal border-red-800 text-red-400 bg-red-900/20">Failed</Badge>
                      }
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{__fmt_date(log.created_at)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DetailsDialog log={log} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length < total && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={load_more}
                disabled={loading_more}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                {loading_more
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Loading...</>
                  : <><ChevronDown className="w-3 h-3" />Load more ({total - logs.length} remaining)</>
                }
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
