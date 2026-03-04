'use client'

import { useState, useEffect }                                                     from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }  from "@/components/ui/card"
import { Button }                                                                   from "@/components/ui/button"
import { Loader2, Copy, Check }                                                    from 'lucide-react'
import { format }                                                                   from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }           from "@/components/ui/table"
import { Badge }                                                                    from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage }                                    from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle }                        from "@/components/ui/dialog"
import { Field, FieldLabel }                                                       from "@/components/ui/field"
import { Input }                                                                    from "@/components/ui/input"
import { Textarea }                                                                 from "@/components/ui/textarea"
import { ScrollArea }                                                               from "@/components/ui/scroll-area"

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
    try {
      await fetch(`/api/recruitment-applications/${app.uuid}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ note, flag })
      })
      set_save_ok(true)
      setTimeout(() => set_save_ok(false), 2000)
      on_review_saved?.(app.uuid, flag, note)
    } catch { /* silent */ }
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
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-lg font-bold text-white">Staff Application Data</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">Submitted application details — read only.</p>
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
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-zinc-500" />
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

                  <Avatar className="w-24 h-24 rounded-full border-2 border-border/40 shadow-md">
                    <AvatarImage src={avatar_url} />
                    <AvatarFallback className="text-2xl bg-zinc-900 text-zinc-300">
                      {app.discord_username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

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

                    <div className="flex gap-2">
                      {(['approved', 'pending', 'declined'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => set_flag(f)}
                          className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                            flag === f ? flag_styles[f] : 'bg-transparent border-border/40 text-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Add a note..."
                      value={note}
                      onChange={(e) => set_note(e.target.value)}
                      className="bg-zinc-900/50 border-border/40 text-zinc-200 text-xs font-normal min-h-[80px] resize-none placeholder:text-zinc-600"
                    />

                    {app.reviewed_by && (
                      <p className="text-xs text-zinc-600">
                        Last reviewed by <span className="text-zinc-400">@{app.reviewed_by}</span>
                        {app.reviewed_at ? ` · ${new Date(app.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={save_review}
                disabled={saving}
                className={`text-xs px-4 ${
                  save_ok
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : save_ok ? 'Saved' : 'Save Review'}
              </Button>
              <Button variant="outline" size="sm" onClick={on_close} className="bg-zinc-900 border-border/40 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                Close
              </Button>
            </div>
          </CardFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function ApplicationsPage() {
  const [loading,       set_loading]      = useState(true)
  const [applications,  set_applications] = useState<any[]>([])
  const [selected_uuid, set_selected_uuid] = useState<string | null>(null)

  function handle_review_saved(uuid: string, flag: staff_application['flag'], note: string) {
    set_applications(prev => prev.map(a => a.uuid === uuid ? { ...a, flag, note } : a))
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Applications</h2>
        <p className="text-muted-foreground text-sm">
          Review all submitted staff applications.
        </p>
      </div>

      <Card className="bg-zinc-950/40 border-border/40">
        <CardHeader>
          <CardTitle className="text-xl text-white">Applications</CardTitle>
          <CardDescription>Review all submitted staff applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Name</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Discord</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Age</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Past CS</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow className="border-border/40 hover:bg-zinc-900/50 transition-colors">
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.sort((a, b) => b.created_at - a.created_at).map((app) => {
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

                    return (
                      <TableRow key={app.uuid || app.discord_id} className="border-border/40 hover:bg-zinc-900/50 transition-colors">
                        <TableCell className="text-zinc-300 font-medium whitespace-nowrap">
                          {format(new Date(app.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-white font-medium">{app.full_name}</TableCell>
                        <TableCell className="text-zinc-400">@{app.discord_username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-zinc-900 border-border/40 text-zinc-300 font-normal">
                            {age} y/o
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium border-0 ${app.past_cs_experience === 'Yes' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800/50 text-zinc-400'}`}
                          >
                            {app.past_cs_experience || 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium border-0 ${
                              app.flag === 'approved' ? 'bg-green-500/10 text-green-400'
                              : app.flag === 'declined' ? 'bg-red-500/10 text-red-400'
                              : 'bg-zinc-800/50 text-zinc-500'
                            }`}
                          >
                            {app.flag ? app.flag.charAt(0).toUpperCase() + app.flag.slice(1) : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => set_selected_uuid(app.uuid || app.discord_id)}
                            className="bg-zinc-900/50 border-border/40 text-zinc-300 hover:text-white hover:bg-zinc-800"
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
    </div>
  )
}
