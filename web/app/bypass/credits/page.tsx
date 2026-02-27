'use client'

import { useState, useEffect, useCallback }              from 'react'
import Image                                             from 'next/image'
import dynamic                                           from 'next/dynamic'
import { IconBrandGithub, IconBrandDiscord, IconCode, IconX, IconCalendar, IconShield, IconCrown } from '@tabler/icons-react'
import { Tabs }                                          from '@/components/ui/tabs'
import { BypassTopbar }                                  from '@/components/bypass-topbar'

// - LAZY LOAD LIGHTRAYS TO AVOID SSR ISSUES (USES WebGL) - \\
const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })

// - DEVELOPER CREDITS DATA - \\
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

// - TECH STACK DATA - \\
const __stack = [
  { label: 'Discord.js',  href: 'https://discord.js.org' },
  { label: 'Next.js',     href: 'https://nextjs.org' },
  { label: 'TypeScript',  href: 'https://www.typescriptlang.org' },
  { label: 'PostgreSQL',  href: 'https://www.postgresql.org' },
  { label: 'Railway',     href: 'https://railway.app' },
]

const __tab_items = [
  { title: 'Developer', value: 'developer' },
  { title: 'Supporter',  value: 'supporter' },
  { title: 'Staff',      value: 'staff' },
]

interface role_member {
  id         : string
  username   : string
  global_name: string | null
  avatar_url : string
}

function CreditLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href      = {href}
      target    = "_blank"
      rel       = "noreferrer"
      className = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:bg-accent hover:text-foreground"
    >
      {icon === 'github'  && <IconBrandGithub  size={12} />}
      {icon === 'discord' && <IconBrandDiscord size={12} />}
      {label}
    </a>
  )
}

function UserAvatar({ initials, avatar_url }: { initials: string; avatar_url: string | null }) {
  if (avatar_url) {
    return (
      <Image
        src       = {avatar_url}
        alt       = {initials}
        width     = {44}
        height    = {44}
        className = "h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
        unoptimized
      />
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-sm font-semibold text-foreground">
      {initials}
    </div>
  )
}

// - - - MEMBER DETAIL PANEL - - - \\

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

function fmt_date(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function MemberDetailPanel({
  member_id,
  on_close,
}: {
  member_id : string
  on_close  : () => void
}) {
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
    <>
      {/* - BACKDROP - \\ */}
      <div
        className = "fixed inset-0 z-40 bg-black/70"
        onClick   = {on_close}
      />

      {/* - PANEL - \\ */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">

        {/* - HEADER - \\ */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Member Info</p>
          <button
            onClick   = {on_close}
            className = "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-4 p-5">
              <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
              <div className="flex items-end gap-3">
                <div className="h-16 w-16 animate-pulse rounded-xl bg-muted" />
                <div className="space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-2.5 w-full animate-pulse rounded bg-muted" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted-foreground">Failed to load member.</p>
            </div>
          )}

          {data && !loading && (
            <div>
              {/* - BANNER & AVATAR CONTAINER - \\ */}
              <div className="relative mb-12">
                {/* - BANNER - \\ */}
                <div className="h-24 w-full bg-muted">
                  {data.banner
                    ? <Image src={data.banner} alt="banner" fill className="object-cover" unoptimized />
                    : <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
                  }
                </div>

                {/* - AVATAR OVERLAPPING BANNER - \\ */}
                <div className="absolute -bottom-8 left-5">
                  <Image
                    src       = {data.avatar}
                    alt       = {data.display_name}
                    width     = {64}
                    height    = {64}
                    className = "h-16 w-16 rounded-xl border-4 border-background object-cover shadow-sm"
                    unoptimized
                  />
                </div>
              </div>

              <div className="px-5">
                {/* - NAME - \\ */}
                <div className="mb-5">
                  <p className="text-base font-bold text-foreground">{data.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{data.username}</p>
                  {data.nickname && data.nickname !== data.display_name && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">aka {data.nickname}</p>
                  )}
                </div>

                {/* - DATES - \\ */}
                <div className="mb-5 space-y-2">
                  {data.joined_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconCalendar size={13} />
                      <span>Joined server <span className="text-foreground">{fmt_date(data.joined_at)}</span></span>
                    </div>
                  )}
                  {data.created_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconCalendar size={13} />
                      <span>Account created <span className="text-foreground">{fmt_date(data.created_at)}</span></span>
                    </div>
                  )}
                  {data.premium_since && (
                    <div className="flex items-center gap-2 text-xs text-yellow-400">
                      <IconCrown size={13} />
                      <span>Boosting since {fmt_date(data.premium_since)}</span>
                    </div>
                  )}
                </div>

                {/* - ROLES - \\ */}
                {data.roles.length > 0 && (
                  <div className="mb-5">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      <IconShield size={11} />
                      Roles
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.roles.map((r) => (
                        <span
                          key       = {r.id}
                          className = "inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground"
                          style     = {{ borderLeftColor: r.color !== '#000000' ? r.color : undefined, borderLeftWidth: r.color !== '#000000' ? 2 : undefined }}
                        >
                          {r.icon && (
                            <Image src={r.icon} alt="" width={12} height={12} className="h-3 w-3 rounded-sm" unoptimized />
                          )}
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// - DEV TAB CONTENT - \\
function DeveloperTab({ avatar_map }: { avatar_map: Record<string, string | null> }) {
  return (
    <div className="space-y-2">
      {__credits.map((credit) => (
        <div
          key       = {credit.name}
          className = "rounded-2xl border border-border bg-card/60 p-5 transition-colors hover:bg-card/80"
        >
          <div className="flex items-start gap-4">
            <UserAvatar initials={credit.initials} avatar_url={avatar_map[credit.discord_id] ?? null} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{credit.name}</p>
                  <span className="rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {credit.role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">@{credit.handle}</p>
                <p className="mt-1.5 text-xs text-muted-foreground/80">{credit.description}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {credit.links.map((link) => (
                  <CreditLink key={link.label} {...link} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <IconCode size={13} className="text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Built with</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {__stack.map((tech) => (
            <a
              key       = {tech.label}
              href      = {tech.href}
              target    = "_blank"
              rel       = "noreferrer"
              className = "rounded-xl border border-border bg-muted/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:bg-muted hover:text-foreground"
            >
              {tech.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// - MEMBER GRID TAB CONTENT - \\
function MemberGrid({ members, loading, on_click }: { members: role_member[]; loading: boolean; on_click: (id: string) => void }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 animate-pulse">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
            <div className="h-2.5 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (!members.length) {
    return <p className="text-center text-sm text-muted-foreground py-10">No members found.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {members.map((m) => (
        <button
          key       = {m.id}
          onClick   = {() => on_click(m.id)}
          className = "flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 text-left hover:bg-card/70 transition-colors"
        >
          <Image
            src       = {m.avatar_url}
            alt       = {m.username}
            width     = {36}
            height    = {36}
            className = "h-9 w-9 shrink-0 rounded-lg border border-border/50 object-cover"
            unoptimized
          />
          <p className="truncate text-xs font-medium text-foreground">{m.username}</p>
        </button>
      ))}
    </div>
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

  // - FETCH DEV AVATARS ON MOUNT - \\
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

  // - FETCH ROLE MEMBERS ON FIRST VISIT TO SUPPORTER/STAFF TAB - \\
  // - FETCH ROLE MEMBERS ON FIRST VISIT TO SUPPORTER/STAFF TAB - \\
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

        // - BOT CACHE STILL WARMING UP — RETRY AFTER DELAY (MAX 3 ATTEMPTS) - \\
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
    <main className="relative min-h-screen bg-background overflow-hidden">

      {/* - LIGHT RAYS BACKGROUND - \\ */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <LightRays
          raysOrigin    = "top-center"
          raysColor     = "#ffffff"
          raysSpeed     = {0.6}
          lightSpread   = {0.4}
          rayLength     = {2.5}
          followMouse   = {false}
          mouseInfluence= {0}
          noiseAmount   = {0.05}
          distortion    = {0}
          pulsating     = {false}
          fadeDistance  = {0.8}
          saturation    = {0}
        />
      </div>

      {/* - SUBTLE TOP GLOW - \\ */}
      <div className="fixed inset-x-0 top-0 z-0 h-64 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.04),transparent)]" />

      <div className="relative z-10 mx-auto max-w-lg px-4 py-20">

        {/* - HEADER - \\ */}
        <div className="mb-8 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
            Atomic Bypass
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Credits</h1>
          <p className="text-sm text-muted-foreground">The people who make this possible.</p>
        </div>

        {/* - TABS NAV - \\ */}
        <Tabs
          tabs      = {__tab_items}
          active    = {active_tab}
          on_change = {set_active_tab}
          className = "mb-6"
        />

        {/* - TAB CONTENT - \\ */}
        {active_tab === 'developer' && <DeveloperTab avatar_map={avatar_map} />}
        {active_tab === 'supporter' && <MemberGrid members={supporters} loading={members_loading} on_click={open_member} />}
        {active_tab === 'staff'     && <MemberGrid members={staff}      loading={members_loading} on_click={open_member} />}

        <div className="mt-12 border-t border-border/40 pt-6">
          <p className="text-center text-[11px] text-muted-foreground/40">
            Made with care. No warranty, just vibes.
          </p>
        </div>

        <div className="h-20" />
      </div>

      <BypassTopbar />

      {/* - MEMBER DETAIL PANEL - \\ */}
      {selected_member && (
        <MemberDetailPanel member_id={selected_member} on_close={close_member} />
      )}
    </main>
  )
}
