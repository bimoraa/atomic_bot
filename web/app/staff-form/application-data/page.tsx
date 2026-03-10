/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AtomicLogo }               from "@/components/icons/atomic_logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge }                    from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Field, FieldLabel }        from "@/components/ui/field"
import { Input }                    from "@/components/ui/input"
import { Textarea }                 from "@/components/ui/textarea"
import { Loader2, CheckCircle2, ShieldAlert, Copy, Check, ClipboardList, Search, Mic2, Award } from "lucide-react"
import { DiscordLogo }              from "@/components/icons/discord_logo"
import { Fragment }                 from "react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

interface staff_application {
  uuid                 : string
  discord_id           : string
  discord_username     : string
  full_name            : string
  dob                  : string
  languages            : string[]
  past_cs_experience   : string
  past_staff_experience: string
  active_other_hub     : string
  handle_upset_users   : string
  handle_uncertainty   : string
  why_join             : string
  good_fit             : string
  other_experience     : string
  unsure_case          : string
  working_mic          : string
  understand_abuse     : string
  additional_questions : string
  created_at           : number
}

function ReadOnlyField({ label, value, is_textarea = false }: { label: string, value: string | string[] | number, is_textarea?: boolean }) {
  const display = Array.isArray(value) ? value.join(", ") : String(value)
  return (
    <Field className="gap-1.5 w-full">
      <FieldLabel className="text-sm text-muted-foreground font-normal">
        {label}
      </FieldLabel>
      {is_textarea ? (
        <Textarea
          readOnly
          value={display || "Not provided"}
          className="dark:bg-background text-sm shadow-xs text-foreground font-medium min-h-[100px] resize-none"
        />
      ) : (
        <Input
          type="text"
          readOnly
          value={display || "Not provided"}
          className="dark:bg-background h-9 text-sm shadow-xs text-foreground font-medium"
        />
      )}
    </Field>
  )
}

const __recruitment_steps = [
  { label: "Applied",      icon: ClipboardList, active: true  },
  { label: "Under Review", icon: Search,        active: false },
  { label: "Interview",    icon: Mic2,          active: false },
  { label: "Decision",     icon: Award,         active: false },
]

const faq_items = [
  {
    title: "When will the interview happen?",
    content: "If you are selected, we will contact you via Discord Direct Message to schedule a voice interview. Make sure your DMs are open.",
  },
  {
    title: "How long does recruitment take?",
    content: "The review process typically takes 3-7 days after the recruitment wave closes. Please be patient and do not ask staff about your application status.",
  },
  {
    title: "What if I get rejected?",
    content: "We usually do not send rejection notices due to the volume of applications. If you don't hear from us within 2 weeks, you can assume you were not selected for this wave. You are welcome to apply again in the future.",
  },
]

function ApplicationDataPageContent() {
  const router        = useRouter()
  const search_params = useSearchParams()
  const uuid          = search_params.get("id")

  const [application, set_application] = useState<staff_application | null>(null)
  const [avatar_url, set_avatar_url]   = useState<string>("")
  const [loading, set_loading]         = useState(true)
  const [not_found, set_not_found]     = useState(false)
  const [copied, set_copied]           = useState(false)

  function copy_id(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      set_copied(true)
      setTimeout(() => set_copied(false), 2000)
    }).catch(() => {})
  }

  useEffect(() => {
    if (!uuid) {
      set_not_found(true)
      set_loading(false)
      return
    }

    fetch(`/api/staff-application/${uuid}`)
      .then(res => {
        if (res.status === 401) {
          router.push(`/login?return_to=/staff-form/application-data?id=${uuid}`)
          return null
        }
        if (!res.ok) {
          set_not_found(true)
          set_loading(false)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        set_application(data.application)
        set_loading(false)
      })
      .catch(() => {
        set_not_found(true)
        set_loading(false)
      })
  }, [uuid, router])

  useEffect(() => {
    if (!application?.discord_id) return
    fetch(`/api/discord-user/${application.discord_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.avatar_url) set_avatar_url(d.avatar_url) })
      .catch(() => {})
  }, [application?.discord_id])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (not_found || !application) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <p className="text-base font-medium">Application not found.</p>
        <p className="text-sm text-muted-foreground">This link may be invalid or the application does not exist.</p>
      </div>
    )
  }

  const applied_date = new Date(application.created_at).toLocaleDateString("en-GB", {
    day   : "2-digit",
    month : "long",
    year  : "numeric",
    hour  : "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  })

  const dob_display = application.dob
    ? new Date(application.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—"

  return (
    <section className="min-h-screen py-8 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl xl:px-16 lg:px-8 px-4 mx-auto">
        <div className="flex flex-col gap-8 items-center w-full">
          
          <div className="flex items-center gap-3">
            <AtomicLogo className="w-8 h-8 text-foreground" />
            <span className="font-semibold text-xl tracking-tight text-foreground">Atomicals</span>
          </div>

          {/* - RECRUITMENT STEPS - \\ */}
          <Breadcrumb>
            <BreadcrumbList>
              {__recruitment_steps.map((step, index) => (
                <Fragment key={index}>
                  <BreadcrumbItem className="shrink-0">
                    {step.active ? (
                      <BreadcrumbPage className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/30 text-primary">
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-primary whitespace-nowrap">{step.label}</span>
                      </BreadcrumbPage>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/60 border border-border/40 text-muted-foreground/50">
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground/40 whitespace-nowrap">{step.label}</span>
                      </div>
                    )}
                  </BreadcrumbItem>
                  {index !== __recruitment_steps.length - 1 && (
                    <li
                      aria-hidden="true"
                      className="inline-block shrink-0 h-[2px] w-[48px] bg-border/40 mb-4 rounded-full"
                      role="presentation"
                    />
                  )}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <Card className="p-0 max-w-4xl w-full gap-0 shadow-none border-none">
            <CardHeader className="gap-1.5 px-6 sm:px-8 pt-8 pb-0 flex flex-row items-start justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-card-foreground tracking-tight">
                  Staff Application Data
                </h2>
                <p className="text-sm text-muted-foreground font-normal">
                  Submitted application details — read only.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background shrink-0 mt-1">
                {application.uuid?.slice(0, 8)}
              </Badge>
            </CardHeader>
            
            <CardContent className="py-8 px-6 sm:px-8">
              <div className="flex lg:flex-row flex-col gap-10">
                
                {/* - LEFT COLUMN: FORM DATA - \\ */}
                <div className="flex-1 lg:pe-12 lg:border-e border-border lg:order-first order-last">
                  <div className="flex flex-col gap-12">
                    
                    {/* Basic Info */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Basic Information</h3>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <ReadOnlyField label="Full Name" value={application.full_name} />
                        <ReadOnlyField label="Date of Birth" value={dob_display} />
                      </div>
                    </div>

                    {/* Scenarios */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Scenarios</h3>
                      <div className="flex flex-col gap-5">
                        {(application.past_staff_experience === "Yes" || application.active_other_hub === "Yes") && (
                          <>
                            <ReadOnlyField label="Handling upset users" value={application.handle_upset_users} is_textarea />
                            <ReadOnlyField label="Handling uncertain situations" value={application.handle_uncertainty} is_textarea />
                            <ReadOnlyField label="Unsure about a specific case" value={application.unsure_case} is_textarea />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Experience & Intent</h3>
                      <div className="flex flex-col gap-5">
                        <ReadOnlyField label="Why join the staff team?" value={application.why_join} is_textarea />
                      </div>
                    </div>

                    {/* Communication */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Communication</h3>
                      <div className="flex flex-col sm:flex-row gap-5">
                        <ReadOnlyField label="Languages" value={application.languages} />
                        <ReadOnlyField label="Past CS Experience" value={application.past_cs_experience} />
                      </div>
                      {application.past_cs_experience === "Yes" && (
                        <div className="flex flex-col sm:flex-row gap-5">
                          <ReadOnlyField label="Past Staff Experience" value={application.past_staff_experience} />
                          {application.past_staff_experience === "No" && (
                            <ReadOnlyField label="Active in Another Hub" value={application.active_other_hub} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Agreements */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Agreements & Additional</h3>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <ReadOnlyField label="Working Mic & Interview" value={application.working_mic} />
                        <ReadOnlyField label="Understands Policy" value={application.understand_abuse} />
                      </div>
                      <ReadOnlyField label="Additional Questions" value={application.additional_questions} is_textarea />
                    </div>

                  </div>
                </div>

                {/* - RIGHT COLUMN: APPLICANT PROFILE - \\ */}
                <div className="w-full lg:w-64 shrink-0">
                  <div className="flex flex-col gap-6 sticky top-6 items-start text-left">
                    <div className="flex flex-col gap-1 w-full">
                      <h6 className="text-primary text-sm font-medium">Applicant Profile</h6>
                      <p className="text-sm text-muted-foreground font-normal">
                        Discord account linked to this application submission.
                      </p>
                    </div>
                    
                    <Avatar className="w-32 h-32 rounded-full border-4 border-background shadow-lg ring-1 ring-border">
                      <AvatarImage src={avatar_url} />
                      <AvatarFallback className="text-3xl bg-muted text-foreground">
                        {application.discord_username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex flex-col items-start gap-2 mt-2">
                      <h5 className="text-foreground text-lg font-medium flex items-center gap-2">
                        {application.full_name}
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </h5>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                        <span className="text-muted-foreground/50">@</span>
                        {application.discord_username}
                      </div>
                      <button
                        onClick={() => copy_id(application.discord_id)}
                        className="flex items-center gap-2 mt-0.5 bg-muted/80 px-2.5 py-1.5 rounded-md border border-border/50 hover:bg-muted hover:border-border transition-colors cursor-pointer group"
                      >
                        <DiscordLogo className="w-3.5 h-3.5 text-white/80" />
                        <p className="text-xs text-muted-foreground/80 font-mono tracking-wide">
                          ID: {application.discord_id}
                        </p>
                        {copied
                          ? <Check className="w-3 h-3 text-green-400 ml-1" />
                          : <Copy className="w-3 h-3 text-muted-foreground/40 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </button>
                    </div>

                    {/* - FAQ ACCORDION - \\ */}
                    <div className="flex flex-col gap-1 mt-6">
                      <h6 className="text-primary text-sm font-medium">Recruitment FAQ</h6>
                      <p className="text-sm text-muted-foreground font-normal">
                        Common questions about the process.
                      </p>
                    </div>
                    
                    <Accordion className="w-full" collapsible type="single">
                      {faq_items.map(({ title, content }, index) => (
                        <AccordionItem
                          className="bg-muted/50 px-4 first:rounded-t-xl last:rounded-b-xl last:border-none border-border"
                          key={index}
                          value={`item-${index}`}
                        >
                          <AccordionTrigger className="text-sm font-medium hover:no-underline text-left">{title}</AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 text-left">
                            {content}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>

              </div>
            </CardContent>

            <CardFooter className="py-6 px-6 sm:px-8 border-t border-border flex justify-between items-center bg-card/50 rounded-b-xl">
              <p className="text-muted-foreground text-sm font-normal">Submitted: {applied_date}</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default function ApplicationDataPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ApplicationDataPageContent />
    </Suspense>
  )
}
