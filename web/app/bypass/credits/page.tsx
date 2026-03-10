/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useState, useEffect, useCallback }              from 'react'
import Image                                             from 'next/image'
import dynamic                                           from 'next/dynamic'
import { motion, AnimatePresence }                       from 'framer-motion'
import { IconBrandGithub, IconBrandDiscord, IconX, IconCalendar, IconCrown } from '@tabler/icons-react'
import { Tabs, TabsList, TabsTrigger }                   from '@/components/ui/tabs'
import { BypassTopbar }                                  from '@/components/layout/bypass_topbar'

// - LAZY LOAD LIGHTRAYS - \\
const LightRays = dynamic(() => import('@/components/animations/light_rays'), { ssr: false })

const __credits = [
  {
    role        : 'Developer',
    name        : 'Kim7',
    handle      : 'v32encrypt',
    discord_id  : '1118453649727823974',
    initials    : 'K7',
    description : 'Built and maintains Atomic Bypass',
    links       : [
      { icon: 'github',  label: 'GitHub',  href: 'https://github.com/bimoraa' },
      { icon: 'discord', label: 'Discord', href: 'https://discord.com/users/1118453649727823974' },
    ],
  },
  {
    role        : 'Developer',
    name        : 'LendowskyDF',
    handle      : 'lendowsky',
    discord_id  : '713377329623072822',
    initials    : 'LD',
    description : 'Co-developer',
    links       : [
      { icon: 'discord', label: 'Discord', href: 'https://discord.com/users/713377329623072822' },
    ],
  },
]

const __stack = [
  { label: 'Discord.js',  href: 'https://discord.js.org' },
  { label: 'Next.js',     href: 'https://nextjs.org' },
  { label: 'TypeScript',  href: 'https://www.typescriptlang.org' },
  { label: 'PostgreSQL',  href: 'https://www.postgresql.org' },
  { label: 'Railway',     href: 'https://railway.app' },
]

const __tab_items = [
  { label: 'Developer', value: 'developer' },
  { label: 'Supporter', value: 'supporter' },
  { label: 'Staff',     value: 'staff' },
]

// - TYPES - \\
interface role_member {
  id         : string
  username   : string
  global_name: string | null
  avatar_url : string
}

interface discord_role {
  id      : string
  name    : string
  color   : string
  icon    : string | null
  position: number
}

interface member_detail {
  id           : string
  username     : string
  display_name : string
  nickname     : string | null
  avatar       : string
  banner       : string | null
  roles        : discord_role[]
  joined_at    : number | null
  created_at   : number | null
  premium_since: number | null
}

// - UTILITY - \\
function fmt_date(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// - COMPONENTS - \\
function CreditLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {icon === 'github'  && <IconBrandGithub  size={14} />}
      {icon === 'discord' && <IconBrandDiscord size={14} />}
      {label}
    </a>
  )
}

function UserAvatar({ initials, avatar_url }: { initials: string; avatar_url: string | null }) {
  if (avatar_url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
        <Image src={avatar_url} alt={initials} fill className="object-cover" unoptimized />
      </div>
    )
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-medium text-foreground">
      {initials}
    </div>
  )
}

function MemberDetailPanel({ member_id, on_close }: { member_id: string; on_close: () => void }) {
  const [data,    set_data]    = useState<member_detail | null>(null)
  const [loading, set_loading] = useState(true)
  const [error,   set_error]   = useState(false)

  useEffect(() => {
    set_data(null)
    set_loading(true)
    set_error(false)

    fetch(`/api/discord-member/${member_id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((d) => { set_data(d); set_loading(false) })
      .catch(() => { set_error(true); set_loading(false) })
  }, [member_id])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-end"
      >
        <div
          className="absolute inset-0 bg-background/90"
          onClick={on_close}
        />
        
        <motion.div
           initial={{ x: '100%' }}
           animate={{ x: 0 }}
           exit={{ x: '100%' }}
           transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
           className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-l border-border bg-background shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-sm font-medium text-foreground">Personnel Record</p>
            <button
              onClick={on_close}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loading && (
              <div className="space-y-4 p-5">
                <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
                <div className="flex items-end gap-3">
                  <div className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
                  <div className="space-y-2 pb-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">Unable to fetch member data.</p>
              </div>
            )}

            {data && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-10">
                <div className="relative mb-12">
                  <div className="h-24 w-full bg-muted">
                    {data.banner && (
                      <Image src={data.banner} alt="banner" fill className="object-cover" unoptimized />
                    )}
                  </div>
                  <div className="absolute -bottom-8 left-5">
                    <Image
                      src={data.avatar}
                      alt={data.display_name}
                      width={64} height={64}
                      className="h-16 w-16 rounded-lg border-4 border-background bg-muted object-cover shadow-sm"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="px-5">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-foreground">{data.display_name}</h2>
                    <p className="text-sm text-muted-foreground">@{data.username}</p>
                    {data.nickname && data.nickname !== data.display_name && (
                      <p className="mt-1 text-xs text-muted-foreground">aka {data.nickname}</p>
                    )}
                  </div>

                  <div className="mb-6 space-y-3">
                     {data.joined_at && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <IconCalendar size={16} className="text-muted-foreground/50" />
                        <span>Joined server <span className="text-foreground">{fmt_date(data.joined_at)}</span></span>
                      </div>
                    )}
                    {data.created_at && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <IconCalendar size={16} className="text-muted-foreground/50" />
                        <span>Registered <span className="text-foreground">{fmt_date(data.created_at)}</span></span>
                      </div>
                    )}
                    {data.premium_since && (
                      <div className="flex items-center gap-3 text-sm text-pink-400">
                        <IconCrown size={16} className="text-pink-400/50" />
                        <span>Boosting since {fmt_date(data.premium_since)}</span>
                      </div>
                    )}
                  </div>

                  {data.roles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {data.roles.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-foreground"
                          >
                            {r.icon ? (
                              <Image src={r.icon} alt="" width={12} height={12} className="h-3 w-3 rounded-sm" unoptimized />
                            ) : (
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color !== '#000000' ? r.color : 'var(--muted-foreground)' }} />
                            )}
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// - DEV TAB CONTENT - \\
function DeveloperTab({ avatar_map }: { avatar_map: Record<string, string | null> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="space-y-4">
      {__credits.map((credit) => (
        <div
          key={credit.name}
          className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border bg-card/40 p-5 transition-colors hover:bg-card/80"
        >
          <UserAvatar initials={credit.initials} avatar_url={avatar_map[credit.discord_id] ?? null} />
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-foreground">{credit.name}</p>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {credit.role}
              </span>
            </div>
            
            <p className="mt-0.5 text-sm text-muted-foreground">@{credit.handle}</p>
            <p className="mt-2 text-sm text-foreground/80">{credit.description}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {credit.links.map((link) => (
                <CreditLink key={link.label} {...link} />
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="pt-6">
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Tech Stack</p>
        <div className="flex flex-wrap gap-2">
          {__stack.map((tech) => (
            <a
              key={tech.label}
              href={tech.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {tech.label}
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// - MEMBER GRID TAB CONTENT - \\
function MemberGrid({ members, loading, on_click }: { members: role_member[]; loading: boolean; on_click: (id: string) => void }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card/30 p-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!members.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">No personnel records found.</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => on_click(m.id)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 text-left transition-colors hover:border-foreground/30 hover:bg-card/80"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={m.avatar_url}
              alt={m.username}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{m.global_name || m.username}</p>
            <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
          </div>
        </button>
      ))}
    </motion.div>
  )
}

export default function CreditsPage() {
  const [active_tab,       set_active_tab]       = useState('developer')
  const [avatar_map,       set_avatar_map]       = useState<Record<string, string | null>>({})
  const [supporters,       set_supporters]       = useState<role_member[]>([])
  const [staff,            set_staff]            = useState<role_member[]>([])
  const [members_loading,  set_members_loading]  = useState(false)
  const [members_fetched,  set_members_fetched]  = useState(false)
  const [selected_member,  set_selected_member]  = useState<string | null>(null)

  const open_member  = useCallback((id: string) => set_selected_member(id), [])
  const close_member = useCallback(() => set_selected_member(null), [])

  useEffect(() => {
    for (const credit of __credits) {
      fetch(`/api/discord-user/${credit.discord_id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.avatar_url) {
            set_avatar_map((prev) => ({ ...prev, [credit.discord_id]: d.avatar_url }))
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if ((active_tab === 'supporter' || active_tab === 'staff') && !members_fetched) {
      set_members_loading(true)

      const fetch_members = async (attempts = 0): Promise<void> => {
        const is_retry = attempts > 0
        const url      = is_retry ? '/api/discord-role-members?refresh=1' : '/api/discord-role-members'

        const res  = await fetch(url)
        const data = await res.json()

        const supporters_raw: role_member[] = Array.isArray(data.supporters) ? data.supporters : []
        const staff_raw     : role_member[] = Array.isArray(data.staff)      ? data.staff      : []

        if (data.loading && attempts < 3) {
          await new Promise(r => setTimeout(r, 6000))
          return fetch_members(attempts + 1)
        }

        set_supporters(supporters_raw)
        set_staff(staff_raw)
        set_members_fetched(true)
      }

      fetch_members()
        .catch(() => {})
        .finally(() => set_members_loading(false))
    }
  }, [active_tab, members_fetched])

  return (
    <main className="relative min-h-screen bg-background text-foreground">

      {/* - SUBTLE WEBGL RAYS - \\ */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 mix-blend-screen">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.3}
          lightSpread={0.4}
          rayLength={2}
          followMouse={false}
          mouseInfluence={0}
          noiseAmount={0.05}
          distortion={0}
          pulsating={false}
          fadeDistance={0.8}
          saturation={0}
        />
      </div>

      <BypassTopbar />

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-24 sm:py-32">
        {/* - HERO HEADER - \\ */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Credits
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            The people who make this bypass network possible.
          </p>
        </div>

        {/* - TABS - \\ */}
        <div className="mb-8 block max-w-fit">
          <Tabs value={active_tab} onValueChange={set_active_tab}>
            <TabsList>
              {__tab_items.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* - CONTENT - \\ */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {active_tab === 'developer' && <DeveloperTab key="dev" avatar_map={avatar_map} />}
            {active_tab === 'supporter' && <MemberGrid key="sup" members={supporters} loading={members_loading} on_click={open_member} />}
            {active_tab === 'staff'     && <MemberGrid key="stf" members={staff}      loading={members_loading} on_click={open_member} />}
          </AnimatePresence>
        </div>

        {/* - FOOTER - \\ */}
        <div className="mt-16 border-t border-border pt-8 pb-10">
          <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
            Atomic Lancar Jaya
          </p>
        </div>
      </div>

      {selected_member && (
        <MemberDetailPanel member_id={selected_member} on_close={close_member} />
      )}
    </main>
  )
}

