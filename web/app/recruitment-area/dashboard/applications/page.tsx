/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useState, useEffect, useRef }                                            from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }  from "@/components/ui/card"
import { Button }                                                                   from "@/components/ui/button"
import { Loader2, Copy, Check, CheckIcon, XIcon, MinusIcon, Search, MoreHorizontal, Eye, StickyNote, ThumbsUp, Clock, ThumbsDown, Trash2 } from 'lucide-react'
import { format }                                                                   from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }           from "@/components/ui/table"
import { Badge }                                                                    from "@/components/ui/badge"
import { Skeleton }                                                                 from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger }                                             from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage }                                    from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle }                        from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
}                                                                                  from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ButtonGroup, ButtonGroupSeparator }                                       from "@/components/ui/button-group"
import { Field, FieldLabel }                                                       from "@/components/ui/field"
import { Input }                                                                    from "@/components/ui/input"
import { Textarea }                                                                 from "@/components/ui/textarea"
import { ScrollArea }                                                               from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger }                                from "@/components/ui/tooltip"
import { toast }                                                                    from "sonner"
import { cn }                                                                       from "@/lib/utils"
import { buttonVariants }                                                           from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface staff_application {
  uuid                  : string
  discord_id            : string
  discord_username      : string
  full_name             : string
  dob                   : string
  languages             : string[]
  past_cs_experience    : string
  past_staff_experience : string
  active_other_hub      : string
  handle_upset_users    : string
  handle_uncertainty    : string
  why_join              : string
  good_fit              : string
  other_experience      : string
  unsure_case           : string
  working_mic           : string
  understand_abuse      : string
  additional_questions  : string
  created_at            : number
  note                 ?: string
  flag                 ?: 'pending' | 'approved' | 'declined'
  reviewed_by          ?: string
  reviewed_at          ?: number
}

function ReadOnlyField({ label, value, is_textarea = false }: { label: string; value: string | string[] | number; is_textarea?: boolean }) {
  const display = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  return (
    <Field className="gap-1.5 w-full">
      <FieldLabel className="text-xs text-zinc-500 font-normal">{label}</FieldLabel>
      {is_textarea ? (
        <Textarea
          readOnly
          value={display || 'Not provided'}
          className="bg-zinc-900/50 border-border/40 text-zinc-200 text-sm font-normal min-h-[90px] resize-none"
        />
      ) : (
        <Input
          type="text"
          readOnly
          value={display || 'Not provided'}
          className="bg-zinc-900/50 border-border/40 text-zinc-200 h-9 text-sm font-normal"
        />
      )}
    </Field>
  )
}

function ApplicationModal({ uuid, open, on_close, on_review_saved }: { uuid: string; open: boolean; on_close: () => void; on_review_saved?: (uuid: string, flag: staff_application['flag'], note: string) => void }) {
  const [app,          set_app]          = useState<staff_application | null>(null)
  const [avatar_url,   set_avatar_url]   = useState('')
  const [loading,      set_loading]      = useState(true)
  const [not_found,    set_not_found]    = useState(false)
  const [copied,       set_copied]       = useState(false)
  const [note,         set_note]         = useState('')
  const [flag,         set_flag]         = useState<staff_application['flag']>('pending')
  const [saving,       set_saving]       = useState(false)
  const [save_ok,      set_save_ok]      = useState(false)

  useEffect(() => {
    if (!open || !uuid) return
    set_loading(true)
    set_not_found(false)
    set_app(null)
    set_avatar_url('')
    set_save_ok(false)

    fetch(`/api/staff-application/${uuid}`)
      .then(res => {
        if (!res.ok) { set_not_found(true); set_loading(false); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        const a = data.application as staff_application
        set_app(a)
        set_note(a.note  ?? '')
        set_flag(a.flag  ?? 'pending')
        set_loading(false)
      })
      .catch(() => { set_not_found(true); set_loading(false) })
  }, [uuid, open])

  useEffect(() => {
    if (!app?.discord_id) return
    fetch(`/api/discord-user/${app.discord_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.avatar_url) set_avatar_url(d.avatar_url) })
      .catch(() => {})
  }, [app?.discord_id])

  function copy_id(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      set_copied(true)
      setTimeout(() => set_copied(false), 2000)
    }).catch(() => {})
  }

  async function save_review() {
    if (!app?.uuid) return
    set_saving(true)
    const tid = toast.loading("Saving review...")
    try {
      const res = await fetch(`/api/recruitment-applications/${app.uuid}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ note, flag })
      })
      if (!res.ok) throw new Error("Failed to save review")
      
      set_save_ok(true)
      setTimeout(() => set_save_ok(false), 2000)
      on_review_saved?.(app.uuid, flag, note)
      toast.success(`Application marked as ${flag}`, { id: tid })
    } catch (err) {
      toast.error("Could not save review", { id: tid })
    }
    set_saving(false)
  }

  const applied_date = app
    ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const flag_styles: Record<NonNullable<staff_application['flag']>, string> = {
    pending : 'bg-zinc-800 text-zinc-400 border-border/40',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    declined: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) on_close() }}>
      <DialogContent className="max-w-4xl w-full bg-zinc-950 border-border/40 p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 flex flex-row items-start justify-between">
          <div className="flex items-center gap-4">
            {app && (
              <Avatar className="w-10 h-10 rounded-full border border-border/40 shadow-sm hidden sm:block">
                <AvatarImage src={avatar_url} />
                <AvatarFallback className="bg-zinc-800 text-xs">{app.discord_username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-lg font-bold text-white">Staff Application Data</DialogTitle>
              <p className="text-sm text-muted-foreground font-normal">Submitted application details — read only.</p>
            </div>
          </div>
          {app && (
            <div className="flex items-center gap-2 mr-6 mt-1">
              <Badge variant="outline" className={`text-xs font-medium border ${flag_styles[flag ?? 'pending']}`}>
                {(flag ?? 'pending').charAt(0).toUpperCase() + (flag ?? 'pending').slice(1)}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs text-zinc-500 bg-zinc-900 border-border/40">
                {app.uuid?.slice(0, 8)}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          {loading ? (
            <div className="flex flex-col space-y-4 p-8">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
          ) : not_found || !app ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <p className="text-sm">Application not found.</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row-reverse gap-0">
              {/* - RIGHT: profile - \\ */}
              <div className="w-full lg:w-64 shrink-0 px-6 py-6 border-b border-border/40 lg:border-b-0 lg:border-l lg:border-border/40">
                <div className="flex flex-col gap-5 sticky top-6">
                  <div className="flex flex-col gap-1">
                    <h6 className="text-sm font-medium text-white">Applicant Profile</h6>
                    <p className="text-xs text-muted-foreground">Discord account linked to this submission.</p>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-fit">
                        <Avatar className={`w-24 h-24 rounded-full shadow-md ring-offset-background ring-offset-2 ring-2 ${
                          flag === 'approved' ? 'ring-green-500'
                          : flag === 'declined' ? 'ring-red-500'
                          : 'ring-zinc-700'
                        }`}>
                          <AvatarImage src={avatar_url} />
                          <AvatarFallback className="text-2xl bg-zinc-900 text-zinc-300">
                            {app.discord_username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -right-1.5 -bottom-1.5 inline-flex size-5 items-center justify-center rounded-full ${
                          flag === 'approved' ? 'bg-green-500'
                          : flag === 'declined' ? 'bg-red-500'
                          : 'bg-zinc-600'
                        }`}>
                          {flag === 'approved' && <CheckIcon className="size-3 text-white" />}
                          {flag === 'declined' && <XIcon     className="size-3 text-white" />}
                          {flag !== 'approved' && flag !== 'declined' && <MinusIcon className="size-3 text-white" />}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl max-w-[220px] space-y-1" side="bottom" sideOffset={8}>
                      <p className="text-xs font-semibold capitalize">{flag ?? 'Pending'}</p>
                      {app.reviewed_by && (
                        <p className="text-xs text-muted-foreground">
                          {flag === 'approved' ? 'Approved' : flag === 'declined' ? 'Declined' : 'Reviewed'} by <span className="text-foreground font-medium">@{app.reviewed_by}</span>
                          {app.reviewed_at ? ` · ${new Date(Number(app.reviewed_at)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      )}
                      {app.note && (
                        <p className="text-xs text-muted-foreground border-t border-border/40 pt-1 mt-1">"{app.note}"</p>
                      )}
                      {!app.reviewed_by && !app.note && (
                        <p className="text-xs text-muted-foreground">No review yet</p>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  <div className="flex flex-col gap-1.5">
                    <h5 className="text-white text-base font-semibold">{app.full_name}</h5>
                    <p className="text-sm text-zinc-400">@{app.discord_username}</p>
                    <button
                      onClick={() => copy_id(app.discord_id)}
                      className="flex items-center gap-2 mt-1 bg-zinc-900/80 px-2.5 py-1.5 rounded-md border border-border/40 hover:bg-zinc-800 transition-colors cursor-pointer group w-fit text-left"
                    >
                      <p className="text-xs text-zinc-500 font-mono tracking-wide text-left">ID: {app.discord_id}</p>
                      {copied
                        ? <Check  className="w-3 h-3 text-green-400 ml-1" />
                        : <Copy   className="w-3 h-3 text-zinc-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>
                  </div>

                  {/* - REVIEW SECTION - \\ */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-border/40">
                    <h6 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Review</h6>

                    <ButtonGroup className="w-full pr-1">
                      <Button
                        onClick={() => set_flag('approved')}
                        size="sm"
                        variant={flag === 'approved' ? 'default' : 'outline'}
                        className={`flex-1 text-xs font-medium ${
                          flag === 'approved'
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'bg-transparent border-border/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                        }`}
                      >
                        Approved
                      </Button>
                      <ButtonGroupSeparator />
                      <Button
                        onClick={() => set_flag('pending')}
                        size="sm"
                        variant={flag === 'pending' ? 'default' : 'outline'}
                        className={`flex-1 text-xs font-medium ${
                          flag === 'pending'
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-700'
                            : 'bg-transparent border-border/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                        }`}
                      >
                        Pending
                      </Button>
                      <ButtonGroupSeparator />
                      <Button
                        onClick={() => set_flag('declined')}
                        size="sm"
                        variant={flag === 'declined' ? 'default' : 'outline'}
                        className={`flex-1 text-xs font-medium ${
                          flag === 'declined'
                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                            : 'bg-transparent border-border/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                        }`}
                      >
                        Declined
                      </Button>
                    </ButtonGroup>

                    <Textarea
                      placeholder="Add a note..."
                      value={note}
                      onChange={(e) => set_note(e.target.value)}
                      className="bg-zinc-900/50 border-border/40 text-zinc-200 text-xs font-normal min-h-[80px] resize-none placeholder:text-zinc-600"
                    />

                    {app.reviewed_by && (
                      <p className="text-xs text-zinc-600">
                        Last reviewed by <span className="text-zinc-400">@{app.reviewed_by}</span>
                        {app.reviewed_at ? ` · ${new Date(Number(app.reviewed_at)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* - LEFT: form data - \\ */}
              <div className="flex-1 px-6 py-6">
                <div className="flex flex-col gap-8">

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Basic Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ReadOnlyField label="Full Name" value={app.full_name} />
                      <ReadOnlyField label="Date of Birth" value={app.dob ? new Date(app.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Communication</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ReadOnlyField label="Languages" value={app.languages} />
                      <ReadOnlyField label="Past CS Experience" value={app.past_cs_experience} />
                    </div>
                    {app.past_cs_experience === 'Yes' && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <ReadOnlyField label="Past Staff Experience" value={app.past_staff_experience} />
                        {app.past_staff_experience === 'No' && (
                          <ReadOnlyField label="Active in Another Hub" value={app.active_other_hub} />
                        )}
                      </div>
                    )}
                  </div>

                  {(app.past_staff_experience === 'Yes' || app.active_other_hub === 'Yes') && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scenarios</h3>
                      <ReadOnlyField label="Handling upset users"           value={app.handle_upset_users}  is_textarea />
                      <ReadOnlyField label="Handling uncertain situations"  value={app.handle_uncertainty}  is_textarea />
                      <ReadOnlyField label="Unsure about a specific case"   value={app.unsure_case}         is_textarea />
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Experience & Intent</h3>
                    <ReadOnlyField label="Why join the staff team?" value={app.why_join} is_textarea />
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Agreements & Additional</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ReadOnlyField label="Working Mic & Interview" value={app.working_mic}       />
                      <ReadOnlyField label="Understands Policy"      value={app.understand_abuse}  />
                    </div>
                    <ReadOnlyField label="Additional Questions" value={app.additional_questions} is_textarea />
                  </div>

                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {app && (
          <CardFooter className="px-6 py-4 border-t border-border/40 flex justify-between items-center bg-zinc-950 rounded-b-xl">
            <p className="text-xs text-zinc-500">Submitted: {applied_date}</p>
            <ButtonGroup>
              <Button
                size="sm"
                onClick={save_review}
                disabled={saving}
                className={`text-xs gap-1.5 ${
                  save_ok
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {saving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : save_ok
                    ? <><CheckIcon className="w-3 h-3" /> Saved</>
                    : <><CheckIcon className="w-3 h-3" /> Save Review</>
                }
              </Button>
              <ButtonGroupSeparator />
              <Button variant="outline" size="sm" onClick={on_close} className="bg-zinc-900 border-border/40 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-1.5 text-xs">
                <XIcon className="w-3 h-3" /> Close
              </Button>
            </ButtonGroup>
          </CardFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function ApplicationsPage() {
  const [loading,       set_loading]      = useState(true)
  const [applications,  set_applications] = useState<any[]>([])
  const [selected_uuid,    set_selected_uuid]    = useState<string | null>(null)
  const [delete_confirm_uuid, set_delete_confirm_uuid] = useState<string | null>(null)
  const [quick_saving,      set_quick_saving]      = useState<string | null>(null)

  // - SEARCH & FILTER STATE - \\
  const [search_query,  set_search_query]  = useState('')
  const [status_filter, set_status_filter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all')

  // - PAGINATION STATE - \\
  const [current_page, set_current_page] = useState(1)
  const items_per_page = 20

  function handle_review_saved(uuid: string, flag: staff_application['flag'], note: string) {
    set_applications(prev => prev.map(a => a.uuid === uuid ? { ...a, flag, note } : a))
  }

  async function quick_set_flag(uuid: string, flag: 'pending' | 'approved' | 'declined') {
    set_quick_saving(uuid)
    try {
      const res = await fetch(`/api/recruitment-applications/${uuid}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ flag })
      })
      if (!res.ok) throw new Error()
      set_applications(prev => prev.map(a => a.uuid === uuid ? { ...a, flag } : a))
      toast.success(`Marked as ${flag}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      set_quick_saving(null)
    }
  }

  async function confirm_delete(uuid: string) {
    try {
      const res = await fetch(`/api/recruitment-applications/${uuid}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      set_applications(prev => prev.filter(a => a.uuid !== uuid))
      toast.success('Application deleted')
    } catch {
      toast.error('Failed to delete application')
    } finally {
      set_delete_confirm_uuid(null)
    }
  }

  useEffect(() => {
    fetch('/api/recruitment-applications')
      .then(r => r.json())
      .then(data => {
        set_applications(data)
        set_loading(false)
      })
      .catch(err => {
        console.error(err)
        set_loading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  // - FILTER, SEARCH & SORT - \\
  const filtered_applications = applications
    .filter(app => {
      const q = search_query.toLowerCase()
      const matches_search = !q
        || app.full_name?.toLowerCase().includes(q)
        || app.discord_username?.toLowerCase().includes(q)
        || app.discord_id?.includes(q)
      const matches_status = status_filter === 'all' || (app.flag ?? 'pending') === status_filter
      return matches_search && matches_status
    })
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))

  // - PAGINATION CALCULATIONS - \\
  const total_pages = Math.ceil(filtered_applications.length / items_per_page) || 1
  const current_items = filtered_applications.slice((current_page - 1) * items_per_page, current_page * items_per_page)

  const render_pagination_pages = () => {
    const pages = []
    for (let i = 1; i <= total_pages; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">Applications</h2>
          <p className="text-muted-foreground text-sm">
            Review and manage all submitted staff applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-zinc-900 border-border/40 font-normal py-1">
            {filtered_applications.length} / {applications.length}
          </Badge>
        </div>
      </div>

      {/* - SEARCH & FILTER BAR - \\ */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by name, username, or ID..."
            value={search_query}
            onChange={e => { set_search_query(e.target.value); set_current_page(1) }}
            className="pl-9 bg-zinc-900/50 border-border/40 text-white placeholder:text-zinc-600 h-9"
          />
        </div>
        <Tabs
          value={status_filter}
          onValueChange={v => { set_status_filter(v as typeof status_filter); set_current_page(1) }}
        >
          <TabsList>
            {(['all', 'pending', 'approved', 'declined'] as const).map(s => {
              const count = s === 'all'
                ? applications.length
                : applications.filter(a => (a.flag ?? 'pending') === s).length
              return (
                <TabsTrigger key={s} value={s} className="flex items-center gap-1 px-2.5 sm:px-3 capitalize">
                  {s === 'all' ? 'All' : s}
                  <Badge className="h-5 min-w-5 px-1 text-[10px]">{count}</Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-zinc-950/40 border-border/40 shadow-xl">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50 border-b border-border/40">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="text-zinc-400 font-medium h-12">Applied Date</TableHead>
                  <TableHead className="text-zinc-400 font-medium h-12">Name</TableHead>
                  <TableHead className="text-zinc-400 font-medium h-12">Discord</TableHead>
                  <TableHead className="text-zinc-400 font-medium h-12">Age</TableHead>
                  <TableHead className="text-zinc-400 font-medium h-12">Experience</TableHead>
                  <TableHead className="text-zinc-400 font-medium h-12">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 font-medium h-12 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current_items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                      No applications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  current_items.sort((a, b) => b.created_at - a.created_at).map((app) => {
                    let age = 0
                    if (app.dob) {
                      const dob_parsed = new Date(app.dob)
                      if (!isNaN(dob_parsed.getTime())) {
                        const today = new Date()
                        age = today.getFullYear() - dob_parsed.getFullYear()
                        const month_diff = today.getMonth() - dob_parsed.getMonth()
                        if (month_diff < 0 || (month_diff === 0 && today.getDate() < dob_parsed.getDate())) age--
                      }
                    }

                    const app_flag = app.flag ?? 'pending'

                    return (
                      <TableRow key={app.uuid || app.discord_id} className="border-b border-border/40 hover:bg-zinc-900/50 transition-colors">
                        <TableCell className="text-zinc-300 font-medium whitespace-nowrap py-4">
                          {format(new Date(app.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell className="text-white font-medium py-4">{app.full_name}</TableCell>
                        <TableCell className="text-zinc-400 py-4">
                          <div className="flex items-center gap-2.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative w-fit shrink-0">
                                  <Avatar className={`w-7 h-7 rounded-full ring-offset-background ring-offset-1 ring-1 ${
                                    app_flag === 'approved' ? 'ring-green-500'
                                    : app_flag === 'declined' ? 'ring-red-500'
                                    : 'ring-zinc-700'
                                  }`}>
                                    <AvatarImage 
                                      src={app.discord_avatar 
                                        ? `https://cdn.discordapp.com/avatars/${app.discord_id}/${app.discord_avatar}.png?size=64` 
                                        : `https://cdn.discordapp.com/embed/avatars/${(parseInt(app.discord_id) >> 22) % 6}.png`
                                      } 
                                    />
                                    <AvatarFallback className="bg-zinc-800 text-[10px]">{app.discord_username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className={`absolute -right-1 -bottom-1 inline-flex size-3.5 items-center justify-center rounded-full ${
                                    app_flag === 'approved' ? 'bg-green-500'
                                    : app_flag === 'declined' ? 'bg-red-500'
                                    : 'bg-zinc-600'
                                  }`}>
                                    {app_flag === 'approved' && <CheckIcon className="size-2 text-white" />}
                                    {app_flag === 'declined' && <XIcon     className="size-2 text-white" />}
                                    {app_flag === 'pending'  && <MinusIcon className="size-2 text-white" />}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl max-w-[220px] space-y-1">
                                <p className="text-xs font-semibold capitalize">{app_flag}</p>
                                {app.reviewed_by && (
                                  <p className="text-xs text-muted-foreground">
                                    {app_flag === 'approved' ? 'Approved' : app_flag === 'declined' ? 'Declined' : 'Reviewed'} by <span className="text-foreground font-medium">@{app.reviewed_by}</span>
                                  </p>
                                )}
                                {app.note && (
                                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-1 mt-1">"{app.note}"</p>
                                )}
                                {!app.reviewed_by && !app.note && (
                                  <p className="text-xs text-muted-foreground">No review yet</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-sm">@{app.discord_username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-zinc-900 border-border/40 text-zinc-300 font-normal">
                            {age} y/o
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`font-medium border-0 ${app.past_cs_experience === 'Yes' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800/50 text-zinc-400'}`}
                          >
                            {app.past_cs_experience || 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${
                              app_flag === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : app_flag === 'declined' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
                            }`}
                          >
                            {app.flag ? app.flag.charAt(0).toUpperCase() + app.flag.slice(1) : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={quick_saving === app.uuid} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => set_selected_uuid(app.uuid || app.discord_id)}>
                                <Eye className="h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => set_selected_uuid(app.uuid || app.discord_id)}>
                                <StickyNote className="h-4 w-4" /> Add Note
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => quick_set_flag(app.uuid, 'approved')} disabled={app_flag === 'approved'}>
                                <ThumbsUp className="h-4 w-4 text-green-400" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => quick_set_flag(app.uuid, 'pending')} disabled={app_flag === 'pending'}>
                                <Clock className="h-4 w-4 text-zinc-400" /> Set Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => quick_set_flag(app.uuid, 'declined')} disabled={app_flag === 'declined'}>
                                <ThumbsDown className="h-4 w-4 text-red-400" /> Decline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-500/10" onClick={() => set_delete_confirm_uuid(app.uuid)}>
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* - PAGINATION UI - \\ */}
          {total_pages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={cn("bg-zinc-900/50 text-zinc-400 border border-border/40 hover:bg-zinc-800 hover:text-white cursor-pointer", current_page === 1 && "pointer-events-none opacity-50")}
                      onClick={() => current_page > 1 && set_current_page(p => p - 1)}
                    />
                  </PaginationItem>

                  {render_pagination_pages().map((page) => {
                    const isActive = page === current_page
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          className={cn("cursor-pointer border border-border/40", {
                            [buttonVariants({
                              variant: "default",
                              className: "shadow-none! hover:text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200",
                            })]: isActive,
                            "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white": !isActive,
                          })}
                          onClick={() => set_current_page(page)}
                          isActive={isActive}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      className={cn("bg-zinc-900/50 text-zinc-400 border border-border/40 hover:bg-zinc-800 hover:text-white cursor-pointer", current_page === total_pages && "pointer-events-none opacity-50")}
                      onClick={() => current_page < total_pages && set_current_page(p => p + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {selected_uuid && (
        <ApplicationModal
          uuid={selected_uuid}
          open={!!selected_uuid}
          on_close={() => set_selected_uuid(null)}
          on_review_saved={handle_review_saved}
        />
      )}

      {/* - DELETE CONFIRM DIALOG - \\ */}
      <AlertDialog open={!!delete_confirm_uuid} onOpenChange={open => !open && set_delete_confirm_uuid(null)}>
        <AlertDialogContent className="bg-zinc-950 border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Application?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. The application will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-border/40 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => delete_confirm_uuid && confirm_delete(delete_confirm_uuid)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
