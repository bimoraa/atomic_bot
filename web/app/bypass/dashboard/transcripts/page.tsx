/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState }                    from 'react'
import { useRouter }                               from 'next/navigation'
import { format }                                  from 'date-fns'
import { BypassFloatingDock }                      from '@/components/layout/bypass_floating_dock'
import { Avatar, AvatarFallback, AvatarImage }    from '@/components/ui/avatar'
import { Button }                                  from '@/components/ui/button'
import { Badge }                                   from '@/components/ui/badge'
import { Calendar }                                from '@/components/ui/calendar'
import { UserDialog }                              from '@/components/features/users/user_dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { IconFileText } from '@tabler/icons-react'
import {
  Loader2, Search, MoreHorizontal, Eye, Info,
  User, Tag, Calendar as CalendarIcon, X,
  ShieldOff,
} from 'lucide-react'

// - RESTRICTED ADMIN ID - \\
const __admin_id = '1118453649727823974'

// - TYPES - \\

interface transcript_item {
  transcript_id  : string
  ticket_id      : string
  ticket_type    : string
  owner_id       : string
  owner_tag      : string
  owner_avatar  ?: string
  claimed_by    ?: string
  claimed_by_id ?: string
  closed_by     ?: string
  closed_by_id  ?: string
  issue_type    ?: string
  description   ?: string
  message_count  : number
  open_time      : number
  close_time     : number
  duration       : number
}

interface discord_user {
  id       : string
  username : string
  avatar  ?: string
}

// - HELPERS - \\

const format_duration = (seconds: number) => {
  const hours   = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const format_date = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month  : 'short',
    day    : 'numeric',
    year   : 'numeric',
    hour   : '2-digit',
    minute : '2-digit',
  })

// - PAGE - \\

export default function BypassTranscriptsPage() {
  const router = useRouter()

  const [user, set_user]                           = useState<discord_user | null>(null)
  const [transcripts, set_transcripts]             = useState<transcript_item[]>([])
  const [filtered, set_filtered]                   = useState<transcript_item[]>([])
  const [loading, set_loading]                     = useState(true)
  const [search, set_search]                       = useState('')
  const [selected_category, set_selected_category] = useState('all')
  const [date_from, set_date_from]                 = useState<Date | undefined>()
  const [date_to, set_date_to]                     = useState<Date | undefined>()
  const [current_page, set_current_page]           = useState(1)
  const [selected_ticket, set_selected_ticket]     = useState<transcript_item | null>(null)
  const [details_open, set_details_open]           = useState(false)
  const [user_dialog_open, set_user_dialog_open]   = useState(false)
  const [selected_user_id, set_selected_user_id]   = useState<string | null>(null)
  const [forbidden, set_forbidden]                 = useState(false)

  const items_per_page = 10

  // - AUTH CHECK (admin only) - \\
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/api/auth/discord?return_to=/bypass/dashboard/transcripts')
          return
        }
        if (data.user.id !== __admin_id) {
          set_forbidden(true)
          set_loading(false)
          return
        }
        set_user(data.user)
        fetch_transcripts()
      })
      .catch(() => router.push('/login'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // - FETCH TRANSCRIPTS - \\
  const fetch_transcripts = async () => {
    try {
      const r = await fetch('/api/transcripts')
      if (!r.ok) {
        console.error('[ - BYPASS TRANSCRIPTS - ] Failed:', r.status)
        return
      }
      const data = await r.json()
      set_transcripts(data.transcripts ?? [])
      set_filtered(data.transcripts ?? [])
    } catch (err) {
      console.error('[ - BYPASS TRANSCRIPTS - ] Error:', err)
    } finally {
      set_loading(false)
    }
  }

  // - FILTERING - \\
  useEffect(() => {
    let result = transcripts

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.transcript_id.toLowerCase().includes(q)  ||
        t.ticket_id.toLowerCase().includes(q)       ||
        t.owner_tag.toLowerCase().includes(q)       ||
        t.ticket_type.toLowerCase().includes(q)     ||
        t.issue_type?.toLowerCase().includes(q)     ||
        t.description?.toLowerCase().includes(q)
      )
    }

    if (selected_category !== 'all') {
      result = result.filter(t => t.ticket_type === selected_category)
    }

    if (date_from) {
      const ts = Math.floor(date_from.getTime() / 1000)
      result = result.filter(t => t.close_time >= ts)
    }
    if (date_to) {
      const ts = Math.floor(date_to.getTime() / 1000) + 86400
      result = result.filter(t => t.close_time <= ts)
    }

    set_filtered(result)
    set_current_page(1)
  }, [search, transcripts, selected_category, date_from, date_to])

  const categories    = ['all', ...Array.from(new Set(transcripts.map(t => t.ticket_type)))]
  const total_pages   = Math.ceil(filtered.length / items_per_page)
  const start_index   = (current_page - 1) * items_per_page
  const end_index     = start_index + items_per_page
  const paginated     = filtered.slice(start_index, end_index)
  const has_filters   = Boolean(search || selected_category !== 'all' || date_from || date_to)

  const clear_filters = () => {
    set_search('')
    set_selected_category('all')
    set_date_from(undefined)
    set_date_to(undefined)
  }

  // - FORBIDDEN - \\
  if (forbidden) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldOff className="w-12 h-12 text-destructive/60" />
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You do not have permission to view transcripts.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/bypass/dashboard')}>
          Back to Configure
        </Button>
        <BypassFloatingDock />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* - TOP BAR - \\ */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/atomc.svg" alt="Atomic" className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground">Bypass Dashboard</span>
            <span className="text-xs text-muted-foreground">/ Transcripts</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                {user.avatar && (
                  <AvatarImage
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`}
                    alt={user.username}
                  />
                )}
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.username}</span>
            </div>
          )}
        </div>
      </header>

      {/* - MAIN CONTENT - \\ */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-28">

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Transcripts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review all ticket transcripts from your support channels.
          </p>
        </div>

        {/* - SEARCH & FILTERS - \\ */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transcripts..."
                value={search}
                onChange={e => set_search(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-empty={!date_from}
                    className="data-[empty=true]:text-muted-foreground h-9 w-full sm:w-[140px] justify-start font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{date_from ? format(date_from, 'MMM dd, yyyy') : 'From date'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date_from} onSelect={set_date_from} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-empty={!date_to}
                    className="data-[empty=true]:text-muted-foreground h-9 w-full sm:w-[140px] justify-start font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{date_to ? format(date_to, 'MMM dd, yyyy') : 'To date'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date_to} onSelect={set_date_to} />
                </PopoverContent>
              </Popover>
              <Select value={selected_category} onValueChange={set_selected_category}>
                <SelectTrigger className="w-full sm:w-[140px] h-9">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(c => c !== 'all').map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {has_filters && (
                <Button variant="ghost" size="sm" onClick={clear_filters} className="h-9 px-3 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {filtered.length > 0 ? start_index + 1 : 0}–{Math.min(end_index, filtered.length)}
            </span>{' '}
            of <span className="font-medium text-foreground">{filtered.length}</span> results
          </p>
        </div>

        {/* - TABLE - \\ */}
        {filtered.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconFileText />
              </EmptyMedia>
              <EmptyTitle>No transcripts found</EmptyTitle>
              <EmptyDescription>
                {has_filters
                  ? 'Try adjusting your filters or search query.'
                  : 'Transcripts will appear here once tickets are closed.'}
              </EmptyDescription>
            </EmptyHeader>
            {has_filters && (
              <EmptyContent>
                <Button variant="outline" onClick={clear_filters}>Clear Filters</Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">

            {/* - MOBILE - \\ */}
            <div className="md:hidden divide-y divide-border">
              {paginated.map(t => {
                const avatar_url = t.owner_id && t.owner_avatar
                  ? `https://cdn.discordapp.com/avatars/${t.owner_id}/${t.owner_avatar}.png`
                  : null
                return (
                  <div key={t.transcript_id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={avatar_url ?? undefined} alt={t.owner_tag} />
                          <AvatarFallback className="text-xs bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.owner_tag.split('#')[0]}</p>
                          <p className="text-xs text-muted-foreground truncate">@{t.owner_tag}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { set_selected_ticket(t); set_details_open(true) }}>
                            <Info className="mr-2 h-4 w-4" /> Ticket Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/transcript/${t.transcript_id}`, '_blank')}>
                            <Eye className="mr-2 h-4 w-4" /> View Transcript
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <code className="text-xs font-mono block mb-3 text-muted-foreground">{t.transcript_id}</code>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Messages</p>
                        <p className="text-sm font-semibold">{t.message_count}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold">{format_duration(t.duration)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">{t.ticket_type}</Badge>
                      {t.issue_type && <Badge variant="outline" className="text-xs">{t.issue_type}</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* - DESKTOP TABLE - \\ */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead className="min-w-[120px]">Transcript ID</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead className="min-w-[140px]">User ID</TableHead>
                    <TableHead className="hidden lg:table-cell">Closed</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(t => {
                    const avatar_url = t.owner_id && t.owner_avatar
                      ? `https://cdn.discordapp.com/avatars/${t.owner_id}/${t.owner_avatar}.png`
                      : null
                    return (
                      <TableRow key={t.transcript_id} className="hover:bg-muted/50">
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatar_url ?? undefined} alt={t.owner_tag} />
                            <AvatarFallback className="text-xs bg-muted">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{t.owner_tag.split('#')[0]}</span>
                            <span className="text-xs text-muted-foreground">@{t.owner_tag}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono">{t.transcript_id}</code>
                        </TableCell>
                        <TableCell className="text-sm">{t.message_count}</TableCell>
                        <TableCell>
                          <code className="text-xs font-mono">{t.owner_id}</code>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {format_date(t.close_time)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs w-fit">{t.ticket_type}</Badge>
                            {t.issue_type && (
                              <Badge variant="outline" className="text-xs w-fit">{t.issue_type}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { set_selected_ticket(t); set_details_open(true) }}>
                                <Info className="mr-2 h-4 w-4" /> Ticket Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/transcript/${t.transcript_id}`, '_blank')}>
                                <Eye className="mr-2 h-4 w-4" /> View Transcript
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* - PAGINATION - \\ */}
        {filtered.length > 0 && total_pages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => set_current_page(p => Math.max(1, p - 1))}
                    className={current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: total_pages }, (_, i) => i + 1).map(page => {
                  const show        = page === 1 || page === total_pages || Math.abs(page - current_page) <= 1
                  const ellipsis_b  = page === current_page - 2 && current_page > 3
                  const ellipsis_a  = page === current_page + 2 && current_page < total_pages - 2
                  if (ellipsis_b || ellipsis_a) return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>
                  if (!show) return null
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => set_current_page(page)}
                        isActive={current_page === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => set_current_page(p => Math.min(total_pages, p + 1))}
                    className={current_page === total_pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      {/* - TICKET DETAILS DIALOG - \\ */}
      <Dialog open={details_open} onOpenChange={set_details_open}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Complete information about this support ticket.</DialogDescription>
          </DialogHeader>
          {selected_ticket && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Transcript ID</p>
                  <code className="text-xs font-mono break-all">{selected_ticket.transcript_id}</code>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ticket ID</p>
                  <code className="text-xs font-mono break-all">{selected_ticket.ticket_id}</code>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Owner</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={selected_ticket.owner_id && selected_ticket.owner_avatar
                        ? `https://cdn.discordapp.com/avatars/${selected_ticket.owner_id}/${selected_ticket.owner_avatar}.png`
                        : undefined}
                      alt={selected_ticket.owner_tag}
                    />
                    <AvatarFallback className="text-xs bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{selected_ticket.owner_tag.split('#')[0]}</p>
                    <p className="text-xs text-muted-foreground">@{selected_ticket.owner_tag}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Messages</p>
                  <p className="text-sm font-semibold">{selected_ticket.message_count}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-semibold">{format_duration(selected_ticket.duration)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Opened</p>
                  <p className="text-xs">{format_date(selected_ticket.open_time)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Closed</p>
                  <p className="text-xs">{format_date(selected_ticket.close_time)}</p>
                </div>
              </div>

              {selected_ticket.claimed_by_id && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Claimed By</p>
                  <button
                    onClick={() => {
                      set_selected_user_id(selected_ticket.claimed_by_id!)
                      set_user_dialog_open(true)
                    }}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    @{selected_ticket.claimed_by ?? selected_ticket.claimed_by_id}
                  </button>
                </div>
              )}

              {selected_ticket.description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed">{selected_ticket.description}</p>
                </div>
              )}

              <Button
                onClick={() => window.open(`/transcript/${selected_ticket.transcript_id}`, '_blank')}
                className="w-full"
                size="lg"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Full Transcript
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* - USER DIALOG - \\ */}
      {selected_user_id && (
        <UserDialog
          user_id={selected_user_id}
          open={user_dialog_open}
          on_close={() => {
            set_user_dialog_open(false)
            set_selected_user_id(null)
          }}
        />
      )}

      <BypassFloatingDock />
    </div>
  )
}
