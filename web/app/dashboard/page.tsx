'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Search, ExternalLink, FileText, Clock, User, Tag, Filter, Calendar as CalendarIcon, X, MoreHorizontal, Eye, Info } from 'lucide-react'
import { IconFileText } from '@tabler/icons-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Calendar } from '@/components/ui/calendar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserDialog } from '@/components/user-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

interface transcript_item {
  transcript_id: string
  ticket_id: string
  ticket_type: string
  owner_id: string
  owner_tag: string
  owner_avatar?: string
  claimed_by?: string
  claimed_by_id?: string
  closed_by?: string
  closed_by_id?: string
  issue_type?: string
  description?: string
  message_count: number
  open_time: number
  close_time: number
  duration: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [transcripts, set_transcripts] = useState<transcript_item[]>([])
  const [filtered_transcripts, set_filtered_transcripts] = useState<transcript_item[]>([])
  const [loading, set_loading] = useState(true)
  const [search, set_search] = useState('')
  const [user, set_user] = useState<any>(null)
  const [selected_category, set_selected_category] = useState<string>('all')
  const [date_from, set_date_from] = useState<Date | undefined>()
  const [date_to, set_date_to] = useState<Date | undefined>()
  const [current_page, set_current_page] = useState(1)
  const [selected_ticket, set_selected_ticket] = useState<transcript_item | null>(null)
  const [details_dialog_open, set_details_dialog_open] = useState(false)
  const [user_dialog_open, set_user_dialog_open] = useState(false)
  const [selected_user_id, set_selected_user_id] = useState<string | null>(null)
  const items_per_page = 10

  useEffect(() => {
    // - Check authentication - \\
    const check_auth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          router.push('/login')
          return
        }
        const data = await response.json()
        set_user(data.user)
        
        if (data.user.id !== '1118453649727823974') {
          router.push('/')
          return
        }
      } catch (error) {
        console.error('[ - AUTH CHECK - ] Error:', error)
        router.push('/login')
      }
    }

    check_auth()
  }, [router])

  useEffect(() => {
    if (!user) return

    const fetch_transcripts = async () => {
      try {
        const response = await fetch('/api/transcripts')
        if (!response.ok) {
          const error_text = await response.text()
          console.error('[ - DASHBOARD - ] Failed to fetch transcripts:', response.status, error_text)
          set_loading(false)
          return
        }
        const data = await response.json()
        console.log('[ - DASHBOARD - ] Fetched transcripts:', data)
        set_transcripts(data.transcripts || [])
        set_filtered_transcripts(data.transcripts || [])
      } catch (error) {
        console.error('[ - DASHBOARD - ] Error:', error)
      } finally {
        set_loading(false)
      }
    }

    fetch_transcripts()
  }, [user])

  useEffect(() => {
    let filtered = transcripts

    // - Filter by search - \\
    if (search.trim()) {
      const query = search.toLowerCase()
      filtered = filtered.filter(t => 
        t.transcript_id.toLowerCase().includes(query) ||
        t.ticket_id.toLowerCase().includes(query) ||
        t.owner_tag.toLowerCase().includes(query) ||
        t.ticket_type.toLowerCase().includes(query) ||
        t.issue_type?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // - Filter by category - \\
    if (selected_category !== 'all') {
      filtered = filtered.filter(t => t.ticket_type === selected_category)
    }

    // - Filter by date range - \\
    if (date_from) {
      const from_timestamp = Math.floor(date_from.getTime() / 1000)
      filtered = filtered.filter(t => t.close_time >= from_timestamp)
    }
    if (date_to) {
      const to_timestamp = Math.floor(date_to.getTime() / 1000) + 86400 // end of day
      filtered = filtered.filter(t => t.close_time <= to_timestamp)
    }

    set_filtered_transcripts(filtered)
  }, [search, transcripts, selected_category, date_from, date_to])

  const categories = ['all', ...Array.from(new Set(transcripts.map(t => t.ticket_type)))]

  // - Pagination calculations - \\
  const total_pages = Math.ceil(filtered_transcripts.length / items_per_page)
  const start_index = (current_page - 1) * items_per_page
  const end_index = start_index + items_per_page
  const paginated_transcripts = filtered_transcripts.slice(start_index, end_index)

  // - Reset to page 1 when filters change - \\
  useEffect(() => {
    set_current_page(1)
  }, [search, selected_category, date_from, date_to])

  const format_duration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const format_date = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* - SIDEBAR - \\ */}
      <DashboardSidebar user={user} active_page="transcripts" />

      {/* - MAIN CONTENT - \\ */}
      <div className="transition-all duration-300 lg:ml-72 py-4 px-4 sm:py-6 sm:px-6 lg:px-8 max-w-7xl">
        {/* - BREADCRUMB - \\ */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Transcripts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* - HEADER - \\ */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Transcripts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage and review all ticket transcripts from your support channels
          </p>
        </div>

        {/* - SEARCH AND FILTERS - \\ */}
        <div className="mb-4 sm:mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* - SEARCH - \\ */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transcripts..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set_search(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* - FILTERS - \\ */}
            <div className="flex flex-wrap items-center gap-2">
              {/* - DATE FROM - \\ */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-empty={!date_from}
                    className="data-[empty=true]:text-muted-foreground h-9 w-full sm:w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{date_from ? format(date_from, "MMM dd, yyyy") : "From date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date_from} onSelect={set_date_from} />
                </PopoverContent>
              </Popover>

              {/* - DATE TO - \\ */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-empty={!date_to}
                    className="data-[empty=true]:text-muted-foreground h-9 w-full sm:w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{date_to ? format(date_to, "MMM dd, yyyy") : "To date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date_to} onSelect={set_date_to} />
                </PopoverContent>
              </Popover>

              {/* - CATEGORY FILTER - \\ */}
              <Select value={selected_category} onValueChange={set_selected_category}>
                <SelectTrigger className="w-full sm:w-[140px] h-9">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(c => c !== 'all').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* - CLEAR FILTERS - \\ */}
              {(date_from || date_to || selected_category !== 'all' || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set_date_from(undefined)
                    set_date_to(undefined)
                    set_selected_category('all')
                    set_search('')
                  }}
                  className="h-9 px-3 text-xs w-full sm:w-auto"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* - RESULTS COUNT - \\ */}
          <div className="text-xs sm:text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered_transcripts.length > 0 ? start_index + 1 : 0}-{Math.min(end_index, filtered_transcripts.length)}</span> of <span className="font-medium text-foreground">{filtered_transcripts.length}</span> results
          </div>
        </div>

        {/* - TRANSCRIPT LIST - \\ */}
        <div>
          {filtered_transcripts.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconFileText />
                </EmptyMedia>
                <EmptyTitle>No transcripts found</EmptyTitle>
                <EmptyDescription>
                  {search || selected_category !== 'all' || date_from || date_to
                    ? 'Try adjusting your filters or search query to find what you\'re looking for.'
                    : 'Transcripts will appear here once tickets are closed.'}
                </EmptyDescription>
              </EmptyHeader>
              {(search || selected_category !== 'all' || date_from || date_to) && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      set_date_from(undefined)
                      set_date_to(undefined)
                      set_selected_category('all')
                      set_search('')
                    }}
                  >
                    Clear Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* - MOBILE CARD VIEW - \\ */}
              <div className="md:hidden divide-y">
                {paginated_transcripts.map((transcript) => {
                  const avatar_url = transcript.owner_id 
                    ? `https://cdn.discordapp.com/avatars/${transcript.owner_id}/${transcript.owner_avatar}.png`
                    : null

                  return (
                    <div key={transcript.transcript_id} className="p-4 hover:bg-muted/50 transition-colors">
                      {/* - HEADER ROW - \\ */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={avatar_url || undefined} alt={transcript.owner_tag} />
                            <AvatarFallback className="text-xs bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{transcript.owner_tag.split('#')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">@{transcript.owner_tag}</p>
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
                            <DropdownMenuItem onClick={() => {
                              set_selected_ticket(transcript)
                              set_details_dialog_open(true)
                            }}>
                              <Info className="mr-2 h-4 w-4" />
                              Ticket Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/transcript/${transcript.transcript_id}`, '_blank')}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Transcript
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* - TICKET ID - \\ */}
                      <div className="mb-3">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{transcript.transcript_id}</code>
                      </div>

                      {/* - STATS GRID - \\ */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Messages</p>
                          <p className="text-sm font-semibold">{transcript.message_count}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Ticket ID</p>
                          <p className="text-xs font-mono font-semibold truncate">{transcript.ticket_id}</p>
                        </div>
                      </div>

                      {/* - CATEGORY AND TIME - \\ */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                            {transcript.ticket_type}
                          </span>
                          {transcript.issue_type && (
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {transcript.issue_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Closed {format_date(transcript.close_time)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* - DESKTOP TABLE VIEW - \\ */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="min-w-[150px]">User</TableHead>
                      <TableHead className="min-w-[120px]">Ticket ID</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead className="min-w-[140px]">User ID</TableHead>
                      <TableHead className="hidden lg:table-cell">Closed</TableHead>
                      <TableHead className="min-w-[120px]">Category</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated_transcripts.map((transcript) => {
                      const avatar_url = transcript.owner_id 
                        ? `https://cdn.discordapp.com/avatars/${transcript.owner_id}/${transcript.owner_avatar}.png`
                        : null

                      return (
                        <TableRow key={transcript.transcript_id} className="hover:bg-muted/50">
                          <TableCell>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={avatar_url || undefined} alt={transcript.owner_tag} />
                              <AvatarFallback className="text-xs bg-muted">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{transcript.owner_tag.split('#')[0]}</span>
                              <span className="text-xs text-muted-foreground">@{transcript.owner_tag}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono">{transcript.transcript_id}</code>
                          </TableCell>
                          <TableCell className="text-sm">{transcript.message_count}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono">{transcript.owner_id}</code>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{format_date(transcript.close_time)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs px-2 py-0.5 bg-muted rounded w-fit">
                                {transcript.ticket_type}
                              </span>
                              {transcript.issue_type && (
                                <span className="text-xs px-2 py-0.5 bg-muted rounded w-fit">
                                  {transcript.issue_type}
                                </span>
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
                              <DropdownMenuItem onClick={() => {
                                set_selected_ticket(transcript)
                                set_details_dialog_open(true)
                              }}>
                                <Info className="mr-2 h-4 w-4" />
                                Ticket Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/transcript/${transcript.transcript_id}`, '_blank')}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Transcript
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
          {filtered_transcripts.length > 0 && total_pages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => set_current_page(p => Math.max(1, p - 1))}
                      className={current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: total_pages }, (_, i) => i + 1).map((page) => {
                    // - Show first page, last page, current page, and pages around current - \\
                    const show_page = 
                      page === 1 ||
                      page === total_pages ||
                      Math.abs(page - current_page) <= 1

                    const show_ellipsis_before = page === current_page - 2 && current_page > 3
                    const show_ellipsis_after = page === current_page + 2 && current_page < total_pages - 2

                    if (show_ellipsis_before || show_ellipsis_after) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }

                    if (!show_page) return null

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
        </div>
      </div>

      {/* - TICKET DETAILS DIALOG - \\ */}
      <Dialog open={details_dialog_open} onOpenChange={set_details_dialog_open}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Complete information about this support ticket
            </DialogDescription>
          </DialogHeader>
          {selected_ticket && (
            <div className="space-y-5">
              {/* - TICKET IDS - \\ */}
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Transcript ID</p>
                  <code className="text-xs font-mono block break-all">{selected_ticket.transcript_id}</code>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Original Ticket ID</p>
                  <code className="text-xs font-mono block break-all">{selected_ticket.ticket_id}</code>
                </div>
              </div>

              {/* - PEOPLE INVOLVED - \\ */}
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Owner</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={selected_ticket.owner_id && selected_ticket.owner_avatar 
                          ? `https://cdn.discordapp.com/avatars/${selected_ticket.owner_id}/${selected_ticket.owner_avatar}.png`
                          : undefined
                        } 
                        alt={selected_ticket.owner_tag} 
                      />
                      <AvatarFallback className="text-xs bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selected_ticket.owner_tag.split('#')[0]}</p>
                      <p className="text-xs text-muted-foreground truncate">@{selected_ticket.owner_tag}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Claimed By</p>
                  {selected_ticket.claimed_by_id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        set_selected_user_id(selected_ticket.claimed_by_id || null)
                        set_user_dialog_open(true)
                      }}
                      className="text-sm text-blue-500 hover:underline font-medium"
                    >
                      @{selected_ticket.claimed_by || selected_ticket.claimed_by_id}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not claimed</p>
                  )}
                </div>

                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Closed By</p>
                  {selected_ticket.closed_by_id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        set_selected_user_id(selected_ticket.closed_by_id || null)
                        set_user_dialog_open(true)
                      }}
                      className="text-sm text-blue-500 hover:underline font-medium"
                    >
                      @{selected_ticket.closed_by || selected_ticket.closed_by_id}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">N/A</p>
                  )}
                </div>
              </div>

              {/* - TICKET METADATA - \\ */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                    <span className="text-xs text-primary font-medium">
                      {selected_ticket.ticket_type}
                    </span>
                  </div>
                  {selected_ticket.issue_type && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Issue</p>
                      <span className="text-xs font-medium">
                        {selected_ticket.issue_type}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Messages</p>
                    <p className="text-sm font-semibold">{selected_ticket.message_count}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm font-semibold">{format_duration(selected_ticket.duration)}</p>
                  </div>
                </div>
              </div>

              {/* - TIMESTAMPS - \\ */}
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Opened At</p>
                  <p className="text-sm">{format_date(selected_ticket.open_time)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Closed At</p>
                  <p className="text-sm">{format_date(selected_ticket.close_time)}</p>
                </div>
              </div>

              {/* - DESCRIPTION - \\ */}
              {selected_ticket.description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm leading-relaxed">{selected_ticket.description}</p>
                </div>
              )}

              {/* - ACTION BUTTON - \\ */}
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
    </div>
  )
}
