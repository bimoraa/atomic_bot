'use client'

import { useEffect, useState, useCallback }       from 'react'
import { useRouter, useParams }                    from 'next/navigation'
import { ManageFloatingDock }                      from '@/components/manage-floating-dock'
import { Avatar, AvatarFallback, AvatarImage }    from '@/components/ui/avatar'
import { StickyBanner }                            from '@/components/ui/sticky-banner'
import {
  Navbar, NavBody, NavItems,
  MobileNav, MobileNavHeader,
  MobileNavToggle, MobileNavMenu,
}                                                  from '@/components/ui/resizable-navbar'
import {
  AlertDialog, AlertDialogAction,
  AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
}                                                  from '@/components/ui/alert-dialog'
import { Loader2, ArrowLeft, FlaskConical,
         Bot }                                     from 'lucide-react'
import { ManageContext }                           from './context'
import type { discord_user, guild_info }           from './context'

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=64`

// - LAYOUT - \\

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const params   = useParams()
  const guild_id = params.guild_id as string

  const [user, set_user]               = useState<discord_user | null>(null)
  const [guild, set_guild]             = useState<guild_info | null>(null)
  const [loading_auth, set_loading]    = useState(true)
  const [mobile_open, set_mobile]      = useState(false)
  const [bot_in_guild, set_bot]        = useState(true)
  const [invite_url, set_invite]       = useState('')

  // - AUTH + GUILD CHECK - \\
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(async data => {
        if (!data.authenticated) {
          router.push(`/api/auth/discord?return_to=/bypass/manage/${guild_id}/overview`)
          return
        }
        set_user(data.user)

        const gr = await fetch('/api/bot-dashboard/guilds')
        if (!gr.ok) { router.push('/bypass/dashboard'); return }
        const gd    = await gr.json()
        const found = (gd.guilds as guild_info[]).find(g => g.id === guild_id)
        if (!found) { router.push('/bypass/dashboard'); return }

        set_guild(found)
        set_loading(false)
      })
      .catch(() => router.push('/login'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild_id])

  // - BOT STATUS CHECK - \\
  const check_bot = useCallback(async () => {
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/bot-status`)
      if (!r.ok) return
      const data = await r.json()
      set_bot(data.in_guild)
      set_invite(data.invite_url ?? '')
    } catch {
      // - non-critical, assume bot is present - \\
    }
  }, [guild_id])

  useEffect(() => {
    if (!loading_auth) check_bot()
  }, [loading_auth, check_bot])

  const nav_items = [
    { name: 'Dashboard', link: '/bypass/dashboard' },
  ]

  if (loading_auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ManageContext.Provider value={{ guild_id, user, guild, loading_auth }}>
      <div className="min-h-screen bg-background">

        {/* - BETA BANNER - \\ */}
        <StickyBanner className="bg-amber-950/80 border-b border-amber-900/60 backdrop-blur-sm" hideOnScroll>
          <div className="flex items-center gap-2 text-amber-200 text-xs">
            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
            <span>
              Management dashboard is currently in <strong>beta</strong>. Some features may not work as expected.
            </span>
          </div>
        </StickyBanner>

        {/* - NAVBAR - \\ */}
        <Navbar>
          <NavBody>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push('/bypass/dashboard')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-muted-foreground/30">/</span>
              <img src="/atomc.svg" alt="Atomic" className="w-5 h-5" />
              {guild?.icon && (
                <img
                  src={__guild_icon_url(guild.id, guild.icon)}
                  alt={guild.name}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                {guild?.name ?? guild_id}
              </span>
            </div>
            <NavItems items={nav_items} />
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
                <span className="text-xs text-muted-foreground">{user.username}</span>
              </div>
            )}
          </NavBody>

          <MobileNav>
            <MobileNavHeader>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/bypass/dashboard')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <img src="/atomc.svg" alt="Atomic" className="w-5 h-5" />
                {guild?.icon && (
                  <img
                    src={__guild_icon_url(guild.id, guild.icon)}
                    alt={guild.name}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                  {guild?.name ?? guild_id}
                </span>
              </div>
              <MobileNavToggle
                isOpen={mobile_open}
                onClick={() => set_mobile(!mobile_open)}
              />
            </MobileNavHeader>
            <MobileNavMenu
              isOpen={mobile_open}
              onClose={() => set_mobile(false)}
            >
              {user && (
                <div className="flex items-center gap-2 pb-2 border-b border-border w-full">
                  <Avatar className="w-7 h-7">
                    {user.avatar && (
                      <AvatarImage
                        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`}
                        alt={user.username}
                      />
                    )}
                    <AvatarFallback className="text-xs bg-muted">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{user.username}</span>
                </div>
              )}
              {nav_items.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  onClick={() => set_mobile(false)}
                  className="text-sm text-neutral-600 dark:text-neutral-300 w-full"
                >
                  {item.name}
                </a>
              ))}
            </MobileNavMenu>
          </MobileNav>
        </Navbar>

        {/* - BOT INVITE DIALOG - \\ */}
        <AlertDialog open={!bot_in_guild}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-4 flex size-9 items-center justify-center rounded-full bg-sky-600/10 sm:mx-0 dark:bg-sky-400/10">
                <Bot className="size-4.5 text-sky-600 dark:text-sky-400" />
              </div>
              <AlertDialogTitle>Bot not in this server</AlertDialogTitle>
              <AlertDialogDescription>
                The bot has not been invited to <strong>{guild?.name ?? 'this server'}</strong> yet.
                Invite it first to start using the management dashboard.
              </AlertDialogDescription>
              <ol className="text-muted-foreground mt-4 flex list-decimal flex-col gap-2 pl-6 text-sm">
                <li>Click <strong>Invite Bot</strong> below</li>
                <li>Select <strong>{guild?.name ?? 'your server'}</strong> in the Discord invite flow</li>
                <li>Authorize the requested permissions</li>
                <li>Return here — the dashboard will unlock automatically</li>
              </ol>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => router.push('/bypass/dashboard')}>
                Go Back
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 dark:focus-visible:ring-sky-500"
                onClick={() => window.open(invite_url, '_blank')}
              >
                Invite Bot
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
          {children}
        </main>

        <ManageFloatingDock guild_id={guild_id} />
      </div>
    </ManageContext.Provider>
  )
}
