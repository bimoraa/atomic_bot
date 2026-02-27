'use client'

import { useState, useEffect }                         from 'react'
import Image                                           from 'next/image'
import { IconBrandGithub, IconBrandDiscord, IconCode } from '@tabler/icons-react'
import { Tabs }                                        from '@/components/ui/tabs'
import { BypassTopbar }                                from '@/components/bypass-topbar'
import DarkVeil                                        from '@/components/DarkVeil'

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

function SmallAvatar({ avatar_url, username }: { avatar_url: string; username: string }) {
  return (
    <Image
      src       = {avatar_url}
      alt       = {username}
      width     = {36}
      height    = {36}
      className = "h-9 w-9 shrink-0 rounded-lg border border-border object-cover"
      unoptimized
    />
  )
}

// - DEV TAB CONTENT - \\
function DeveloperTab({ avatar_map }: { avatar_map: Record<string, string | null> }) {
  return (
    <div className="space-y-2">
      {__credits.map((credit) => (
        <div
          key       = {credit.name}
          className = "rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 transition-colors hover:bg-card/80"
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
function MemberGrid({ members, loading }: { members: role_member[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 animate-pulse">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-3/4 rounded bg-muted" />
            </div>
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
        <a
          key       = {m.id}
          href      = {`https://discord.com/users/${m.id}`}
          target    = "_blank"
          rel       = "noreferrer"
          className = "flex items-center gap-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3 transition-colors hover:bg-card/80"
        >
          <SmallAvatar avatar_url={m.avatar_url} username={m.username} />
          <p className="truncate text-xs font-medium text-foreground">{m.username}</p>
        </a>
      ))}
    </div>
  )
}

export default function CreditsPage() {
  const [active_tab,      set_active_tab]      = useState('developer')
  const [avatar_map,      set_avatar_map]      = useState<Record<string, string | null>>({})
  const [supporters,      set_supporters]      = useState<role_member[]>([])
  const [staff,           set_staff]           = useState<role_member[]>([])
  const [members_loading, set_members_loading] = useState(false)
  const [members_fetched, set_members_fetched] = useState(false)

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
  useEffect(() => {
    if ((active_tab === 'supporter' || active_tab === 'staff') && !members_fetched) {
      set_members_loading(true)
      fetch('/api/discord-role-members')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.supporters)) set_supporters(d.supporters)
          if (Array.isArray(d.staff))      set_staff(d.staff)
          set_members_fetched(true)
        })
        .catch(() => {})
        .finally(() => set_members_loading(false))
    }
  }, [active_tab, members_fetched])

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">

      {/* - DARKVEIL BACKGROUND - \\ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <DarkVeil
          hueShift          = {0}
          noiseIntensity    = {0}
          scanlineIntensity = {0}
          speed             = {0.9}
          scanlineFrequency = {0}
          warpAmount        = {0}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 py-20">

        {/* - HEADER - \\ */}
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
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
        {active_tab === 'supporter' && <MemberGrid members={supporters} loading={members_loading} />}
        {active_tab === 'staff'     && <MemberGrid members={staff}      loading={members_loading} />}

        <div className="mt-10">
          <p className="text-center text-[11px] text-muted-foreground/50">
            Made with care. No warranty, just vibes.
          </p>
        </div>

        <div className="h-20" />
      </div>

      <BypassTopbar />
    </main>
  )
}
