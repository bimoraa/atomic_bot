'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Search, ExternalLink, FileText, Clock, User, Tag, Filter, Calendar as CalendarIcon, X } from 'lucide-react'
import { IconFileText } from '@tabler/icons-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Calendar } from '@/components/ui/calendar'
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
  claimed_by?: string
  closed_by?: string
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
      <div className="transition-all duration-300 ml-72 py-6 px-8 max-w-7xl">
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Transcripts</h1>
          <p className="text-sm text-muted-foreground">
            Manage and review all ticket transcripts from your support channels
          </p>
        </div>

        {/* - SEARCH AND FILTERS - \\ */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
              {/* - DATE FROM - \\ */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-empty={!date_from}
                    className="data-[empty=true]:text-muted-foreground h-9 w-[150px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date_from ? format(date_from, "MMM dd, yyyy") : "From date"}
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
                    className="data-[empty=true]:text-muted-foreground h-9 w-[150px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date_to ? format(date_to, "MMM dd, yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date_to} onSelect={set_date_to} />
                </PopoverContent>
              </Popover>

              {/* - CATEGORY FILTER - \\ */}
              <Select value={selected_category} onValueChange={set_selected_category}>
                <SelectTrigger className="w-[160px] h-9">
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
                  className="h-9 px-3 text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* - RESULTS COUNT - \\ */}
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered_transcripts.length > 0 ? start_index + 1 : 0}-{Math.min(end_index, filtered_transcripts.length)}</span> of <span className="font-medium text-foreground">{filtered_transcripts.length}</span> results
          </div>
        </div>

        {/* - TRANSCRIPT LIST - \\ */}
        <div>
          <div className="space-y-2">
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
              paginated_transcripts.map((transcript) => (
                <Card
                  key={transcript.transcript_id}
                  className="bg-card border-border hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => window.open(`/transcript/${transcript.transcript_id}`, '_blank')}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-mono text-foreground">
                            {transcript.transcript_id}
                          </code>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                            {transcript.ticket_type}
                          </span>
                          {transcript.issue_type && (
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                              {transcript.issue_type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="truncate">{transcript.owner_tag}</span>
                          <span>·</span>
                          <span>{transcript.message_count} messages</span>
                          <span>·</span>
                          <span>{format_duration(transcript.duration)}</span>
                          <span>·</span>
                          <span>{format_date(transcript.close_time)}</span>
                        </div>

                        {transcript.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-2">
                            {transcript.description}
                          </p>
                        )}
                      </div>

                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

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
    </div>
  )
}
